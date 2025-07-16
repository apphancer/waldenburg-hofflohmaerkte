SHELL := /bin/bash

tests: export APP_ENV=test
tests:
	symfony console doctrine:database:drop --force || true
	symfony console doctrine:database:create
	symfony console doctrine:schema:create
	symfony console doctrine:fixtures:load -n
	symfony php bin/phpunit $@
.PHONY: tests



start: export APP_ENV=dev
start:
	docker compose -p whfm stop
	docker compose -p whfm up -d
	symfony server:start --daemon # this also starts tailwind:build if specified in .symfony.local.yaml
.PHONY: start


stop: export APP_ENV=dev
stop:
	docker compose -p whfm stop
	symfony local:server:stop
.PHONY: stop

populate: export APP_ENV=dev
populate:
	symfony console doctrine:database:drop --force || true
	symfony console doctrine:database:create
	symfony console doctrine:schema:create
	symfony php -d memory_limit=-1 bin/console doctrine:fixtures:load -n
.PHONY: populate