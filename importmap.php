<?php

/**
 * Returns the importmap for this application.
 *
 * - "path" is a path inside the asset mapper system. Use the
 *     "debug:asset-map" command to see the full list of paths.
 *
 * - "entrypoint" (JavaScript only) set to true for any module that will
 *     be used as an "entrypoint" (and passed to the importmap() Twig function).
 *
 * The "importmap:require" command can be used to add new entries to this file.
 */
return [
    'app' => [
        'path' => './assets/app.js',
        'entrypoint' => true,
    ],
    '@hotwired/stimulus' => [
        'version' => '3.2.2',
    ],
    '@symfony/stimulus-bundle' => [
        'path' => './vendor/symfony/stimulus-bundle/assets/dist/loader.js',
    ],
    '@hotwired/turbo' => [
        'version' => '7.3.0',
    ],
    'mapbox-gl' => [
        'version' => '3.6.0',
    ],
    'mapbox-gl/dist/mapbox-gl.min.css' => [
        'version' => '3.6.0',
        'type' => 'css',
    ],
    '@googlemaps/js-api-loader' => [
        'version' => '1.16.10',
    ],
    '@googlemaps/markerclusterer' => [
        'version' => '2.6.2',
    ],
    'fast-equals' => [
        'version' => '5.2.2',
    ],
    'supercluster' => [
        'version' => '8.0.1',
    ],
    'kdbush' => [
        'version' => '4.0.2',
    ],
];
