// Package httpclient crea clientes HTTP salientes que solo alcanzan destinos públicos.
package httpclient

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/netip"
	"slices"
	"time"

	"openreclamos.com/api/internal/shared/constants"
)

const (
	maxResponseBytes = 2 * 1024 * 1024
	dialTimeout      = 10 * time.Second
	ssoTimeout       = 10 * time.Second
)

// Clients agrupa los transportes salientes de la aplicación.
type Clients struct {
	// Transport alcanza solo IP públicas (webhooks, captcha, consulta documental).
	Transport *http.Transport
	// SSO consulta proveedores de identidad; SSO_ALLOWED_HOSTS puede autorizar hosts privados.
	SSO *http.Client
}

// New construye los clientes; allowedSSOHosts permite IdP internos.
func New(allowedSSOHosts []string) *Clients {
	return &Clients{
		Transport: NewSafeTransport(nil),
		SSO: &http.Client{
			Transport:     LimitedHTTPS{Base: NewSafeTransport(allowedSSOHosts)},
			Timeout:       ssoTimeout,
			CheckRedirect: DenyRedirect,
		},
	}
}

// Safe devuelve un cliente HTTPS sin redirecciones y con respuesta acotada.
func (c *Clients) Safe(timeout time.Duration) *http.Client {
	return &http.Client{Transport: LimitedHTTPS{Base: c.Transport}, Timeout: timeout, CheckRedirect: DenyRedirect}
}

// PublicIP indica si la IP es enrutable públicamente.
func PublicIP(ip netip.Addr) bool {
	return ip.IsGlobalUnicast() && !ip.IsPrivate() && !ip.IsLoopback() && !ip.IsLinkLocalUnicast() &&
		!ip.IsMulticast() &&
		!ip.IsUnspecified() &&
		!netip.MustParsePrefix("100.64.0.0/10").Contains(ip) &&
		!netip.MustParsePrefix("198.18.0.0/15").Contains(ip)
}

// PublicHost resuelve host y exige que todas sus IP sean públicas.
func PublicHost(ctx context.Context, host string) error {
	ips, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
	if err != nil || len(ips) == 0 {
		return errors.New(constants.MsgUnresolvableTarget)
	}

	for _, ip := range ips {
		if !PublicIP(ip.Unmap()) {
			return errors.New(constants.MsgPrivateTarget)
		}
	}

	return nil
}

// LimitedHTTPS exige HTTPS sin credenciales y limita el tamaño de la respuesta.
type LimitedHTTPS struct{ Base http.RoundTripper }

type limitedBody struct {
	io.Reader
	Closer io.Closer
}

func (body limitedBody) Close() error { return body.Closer.Close() }

func (transport LimitedHTTPS) RoundTrip(request *http.Request) (*http.Response, error) {
	if request.URL.Scheme != "https" || request.URL.User != nil {
		return nil, errors.New(constants.MsgProviderMustUseHTTPS)
	}

	response, err := transport.Base.RoundTrip(request)
	if err == nil {
		response.Body = limitedBody{Reader: io.LimitReader(response.Body, maxResponseBytes), Closer: response.Body}
	}

	return response, err
}

// DenyRedirect evita seguir redirecciones hacia destinos no validados.
func DenyRedirect(r *http.Request, via []*http.Request) error { return http.ErrUseLastResponse }

// NewSafeTransport resuelve el destino y rechaza IP privadas salvo allowedHosts.
func NewSafeTransport(allowedHosts []string) *http.Transport {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil

	transport.DialContext = func(ctx context.Context, network, address string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(address)
		if err != nil {
			return nil, err
		}

		ips, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
		if err != nil || len(ips) == 0 {
			return nil, errors.New(constants.MsgUnresolvableTarget)
		}

		for _, ip := range ips {
			if !slices.Contains(allowedHosts, host) && !PublicIP(ip.Unmap()) {
				return nil, errors.New(constants.MsgPrivateTarget)
			}
		}

		dialer := net.Dialer{Timeout: dialTimeout}

		return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].String(), port))
	}

	return transport
}
