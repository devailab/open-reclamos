package repository

import "context"

// Fragmentos SQL que no tienen una forma común entre motores.

func (r *Repository) postgres() bool { return r.db.Dialector.Name() == "postgres" }

// epochSeconds convierte una columna de fecha en segundos Unix.
func (r *Repository) epochSeconds(column string) string {
	if r.postgres() {
		return "EXTRACT(EPOCH FROM " + column + ")"
	}

	return "((julianday(" + column + ") - 2440587.5) * 86400.0)"
}

// BootstrapLock serializa las altas iniciales de usuarios dentro de la transacción actual.
// En SQLite la transacción IMMEDIATE ya tiene el bloqueo exclusivo de escritura.
func (r *Repository) bootstrapLock() error {
	if !r.postgres() {
		return nil
	}

	return r.db.Exec("SELECT pg_advisory_xact_lock(71964231)").Error
}

// evita reservar el mismo alias desde dos transacciones al mismo tiempo.
func (r *Repository) LockBusinessDomains(ctx context.Context) error {
	if !r.postgres() {
		return nil
	}

	return r.conn(ctx).Exec("SELECT pg_advisory_xact_lock(71964232)").Error
}
