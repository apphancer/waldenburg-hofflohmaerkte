FROM dunglas/frankenphp:1.7-php8.4-bookworm

ENV SERVER_NAME=waldenburghofmarkt.kleinodd.de:80

# Perform system-level operations as root
USER root

# Add user and set necessary capabilities
RUN setcap CAP_NET_BIND_SERVICE=+eip /usr/local/bin/frankenphp \
    && chown -R www-data:www-data /data/caddy \
    && chown -R www-data:www-data /config/caddy


# Install PHP extensions
RUN install-php-extensions @composer pdo_sqlite intl soap curl xsl zip gd mbstring

# Change ownership of the app directory to www-data
RUN chown -R www-data:www-data /app

# Finish Composer autoload generation
# RUN composer dump-autoload --optimize

# Switch to non-root user for running the application
USER www-data
