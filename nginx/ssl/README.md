# SSL Certificates for Nginx

Bu klasörde SSL sertifikaları bulunmalıdır:
- `server.crt` - Sertifika dosyası
- `server.key` - Özel anahtar dosyası

## Development (Self-Signed)

Windows'ta OpenSSL yoksa, Docker ile oluşturabilirsiniz:

```bash
docker run --rm -v ${PWD}/nginx/ssl:/certs alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt -subj "/CN=localhost"
```

Veya WSL/Git Bash kullanarak:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt -subj "/CN=localhost"
```

## Production (Let's Encrypt)

Canlı ortamda Certbot kullanarak ücretsiz sertifika alabilirsiniz:
```bash
certbot certonly --webroot -w /var/www/certbot -d yourdomain.com
```

Sertifikalar `/etc/letsencrypt/live/yourdomain.com/` altında oluşacaktır.
