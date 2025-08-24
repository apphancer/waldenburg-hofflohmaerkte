#!/bin/bash

# Exit the script as soon as a command fails.
set -o errexit

# Setup the variables
VERSION=${VERSION:?Missing VERSION environment variable}
PROJECT=whfm
SERVICE=php-1

# Transform '.' into '-' in VERSION for tagging purposes
VERSION=$(echo $VERSION | tr '.' '-')
CONTAINER_NAME="${PROJECT}-${VERSION}-${SERVICE}"

echo "$VERSION"


# Clean up unnecessary files and copy environment file
#rm -rf tests # do not delete here as this would cause issues with git checkout. Instead delete inside container


sudo chown -R www-data /var/www/$PROJECT
sudo chgrp -R www-data /var/www/$PROJECT

# Start docker containers
docker compose -p "${PROJECT}-${VERSION}" -f .deploy/docker-compose.prod.yml up --build --no-start
docker compose -p "${PROJECT}-${VERSION}" -f .deploy/docker-compose.prod.yml up -d

# Deployment tasks
docker exec -u www-data "${CONTAINER_NAME}" composer install --no-scripts --no-dev --optimize-autoloader
docker exec -u www-data "${CONTAINER_NAME}" composer dump-env prod
docker exec -u www-data "${CONTAINER_NAME}" bin/console cache:clear --no-warmup --no-debug
docker exec -u www-data "${CONTAINER_NAME}" bin/console cache:warmup
docker exec -u www-data "${CONTAINER_NAME}" php bin/console importmap:install
docker exec -u www-data "${CONTAINER_NAME}" php bin/console tailwind:build
docker exec -u www-data "${CONTAINER_NAME}" php bin/console asset-map:compile

# Update Caddy
cp .deploy/Caddyfile /var/www/server/sites/$PROJECT
cd /var/www/server
SITE_NAME=$PROJECT NEW_VERSION=$VERSION SERVICE=$SERVICE ./src/update-site.sh
./src/build-config.sh
docker compose restart

# Remove old containers
docker ps -a --format "{{.ID}}:{{.Names}}" |
grep -E "${PROJECT}-v[0-9]+-[0-9]+-[0-9]+-${SERVICE}" |
grep -v "$CONTAINER_NAME" |
awk -F":" '{print $1}' |
xargs -n1 docker stop |
xargs -n1 docker rm

# Remove all unused containers, networks, images, and volumes
docker system prune --volumes -f
docker volume ls -qf dangling=true | xargs -r docker volume rm
docker image prune -a -f

# Create a RELEASE file
echo "$CONTAINER_NAME" > /var/www/$PROJECT/.deploy/RELEASE