package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"golang.org/x/term"
	"openreclamos.com/api/internal/app"
	"openreclamos.com/api/internal/modules/identity/feature/installation"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database"
)

var version = "dev"

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	if err := run(logger); err != nil {
		logger.Error(constants.CLIRunFailed, "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	flags := flag.NewFlagSet("open-reclamos", flag.ContinueOnError)
	envFile := flags.String("env-file", ".env", constants.CLIFlagEnvFile)
	name := flags.String("name", constants.CLIDefaultAdminName, constants.CLIFlagName)
	lastName := flags.String("last-name", "", constants.CLIFlagLastName)
	email := flags.String("email", "", constants.CLIFlagEmail)
	documentType := flags.String("document-type", "DNI", constants.CLIFlagDocumentType)
	documentNumber := flags.String("document-number", "", constants.CLIFlagDocumentNumber)
	organization := flags.String("organization", "", constants.CLIFlagOrganization)

	if err := flags.Parse(os.Args[1:]); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}

		return err
	}

	command := "serve"

	if flags.NArg() > 0 {
		command = flags.Arg(0)
	}

	if flags.NArg() > 1 {
		return errors.New(constants.CLIUnexpectedArgs)
	}

	if command == "version" {
		fmt.Println(version)

		return nil
	}

	if command != "serve" && command != "migrate" && command != "seed" && command != "bootstrap" &&
		command != "reset-password" &&
		command != "recover-sso" {
		return errors.New(constants.CLIUnknownCommand)
	}

	// con --env-file el archivo es obligatorio; sin el flag, usa el .env solo si existe
	explicit := false

	flags.Visit(func(f *flag.Flag) { explicit = explicit || f.Name == "env-file" })

	cfg, err := config.Load(*envFile, explicit)
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := database.Open(ctx, cfg)
	if err != nil {
		return err
	}

	defer database.Close(db)

	if command == "migrate" {
		if err := database.Migrate(ctx, db); err != nil {
			return err
		}

		logger.Info(constants.LogMigrationsApplied, "driver", cfg.DatabaseDriver)

		return nil
	}

	// los demás comandos exigen que las migraciones ya estén aplicadas
	if err := database.Ready(ctx, db); err != nil {
		return err
	}

	application := app.New(db, cfg)

	if command != "serve" {
		if command == "seed" {
			if err := database.Seed(ctx, db); err != nil {
				return err
			}

			logger.Info(constants.LogCatalogsSeeded)

			return nil
		}

		// si una empresa se bloquea con su sso, la vuelve a acceso local
		if command == "recover-sso" {
			return application.RecoverSSO(ctx, *organization)
		}

		// la contraseña se pide por teclado, nunca por flag
		password, err := readPassword()
		if err != nil {
			return err
		}

		if command == "bootstrap" {
			return application.Bootstrap(ctx, installation.Admin{
				Name: *name, Email: *email, Password: password,
				LastName:     *lastName,
				DocumentType: *documentType, DocumentNumber: *documentNumber,
			})
		}

		return application.ResetPassword(ctx, *email, password)
	}

	if err := application.StartWorkers(ctx); err != nil {
		return err
	}

	defer func() {
		shutdown, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		_ = application.Jobs.Stop(shutdown)
	}()

	server := &http.Server{
		Addr: cfg.HTTPAddr, Handler: application.Handler(version),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second,
		WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second,
	}

	errorsChannel := make(chan error, 1)

	go func() { errorsChannel <- server.ListenAndServe() }()

	logger.Info(constants.LogServerStarted, "address", cfg.HTTPAddr, "version", version)

	select {
	case err := <-errorsChannel:
		if !errors.Is(err, http.ErrServerClosed) {
			return errors.New(constants.CLIServerStartFailed)
		}

		return nil

	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		logger.Info(constants.LogServerStopping)

		if err := server.Shutdown(shutdown); err != nil {
			_ = server.Close()

			return errors.New(constants.CLIServerStopTimedOut)
		}

		return nil
	}
}

func readPassword() (string, error) {
	if term.IsTerminal(int(os.Stdin.Fd())) {
		fmt.Fprint(os.Stderr, constants.CLIPasswordPrompt)

		password, err := term.ReadPassword(int(os.Stdin.Fd()))

		fmt.Fprintln(os.Stderr)

		return string(password), err
	}

	reader := bufio.NewReaderSize(os.Stdin, 1024)
	password, _, err := reader.ReadLine()
	if len(password) > 256 {
		return "", errors.New(constants.CLIPasswordTooLong)
	}

	return string(password), err
}
