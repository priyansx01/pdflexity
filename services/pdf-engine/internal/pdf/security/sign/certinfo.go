package sign

import (
	"time"

	"software.sslmate.com/src/go-pkcs12"
	"os"
	"fmt"
)

// CertInfo holds extracted certificate metadata
type CertInfo struct {
	CommonName   string    `json:"common_name"`
	Organization string    `json:"organization"`
	Email        string    `json:"email"`
	ValidFrom    time.Time `json:"valid_from"`
	ValidUntil   time.Time `json:"valid_until"`
	Issuer       string    `json:"issuer"`
	IsExpired    bool      `json:"is_expired"`
}

func GetCertInfo(certPath, passphrase string) (*CertInfo, error) {
	pfxData, err := os.ReadFile(certPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read cert file: %v", err)
	}

	_, cert, _, err := pkcs12.DecodeChain(pfxData, passphrase)
	if err != nil {
		return nil, fmt.Errorf("failed to decode pkcs12: %v", err)
	}

	var email string
	if len(cert.EmailAddresses) > 0 {
		email = cert.EmailAddresses[0]
	}

	now := time.Now()
	isExpired := now.After(cert.NotAfter)

	return &CertInfo{
		CommonName:   cert.Subject.CommonName,
		Organization: getFirstOrEmpty(cert.Subject.Organization),
		Email:        email,
		ValidFrom:    cert.NotBefore,
		ValidUntil:   cert.NotAfter,
		Issuer:       cert.Issuer.CommonName,
		IsExpired:    isExpired,
	}, nil
}

func getFirstOrEmpty(s []string) string {
	if len(s) > 0 {
		return s[0]
	}
	return ""
}
