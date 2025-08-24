<?php

namespace App\Controller;

use App\Entity\Stall;
use App\Form\StallType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bridge\Twig\Mime\NotificationEmail;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Ulid;

final class StallController extends AbstractController
{

    public function __construct(private readonly EntityManagerInterface $em, private readonly MailerInterface $mailer)
    {
    }

    #[Route('/stall/create', name: 'app_stall_create')]
    public function create(Request $request): Response
    {
        $stall = new Stall();

        $form = $this->createForm(StallType::class, $stall);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $stall
                ->setPublicUuid(new Ulid()->toBase32())
                ->setPrivateUuid(new Ulid()->toBase32())
                ->setCreatedAt(new \DateTimeImmutable())
                ->setIsPublished(false);

            $this->em->persist($stall);
            $this->em->flush();

            $this->sendEmail($stall);

            $this->addFlash('success', 'Your stall registration has been submitted successfully!');

            return $this->redirectToRoute('app_stall_success', ['uuid' => $stall->getPrivateUuid()]);
        }

        if($form->isSubmitted() && !$form->isValid()) {
            $address = $form->get('address')->getData();
        }

        return $this->render('stall/index.html.twig', [
            'isNew'   => true,
            'form'    => $form,
            'address' => $address ?? null,
        ]);
    }

    #[Route('/stall/{uuid}/success', name: 'app_stall_success')]
    public function success(
        Request $request,
        #[MapEntity(mapping: ['uuid' => 'privateUuid'])] Stall $stall
    ): Response {
        return $this->render('stall/success.html.twig', [
            'stall' => $stall,
        ]);
    }

    #[Route('/stall/{uuid}/edit', name: 'app_stall_edit')]
    public function edit(
        Request $request,
        #[MapEntity(mapping: ['uuid' => 'privateUuid'])] Stall $stall
    ): Response {
        $form = $this->createForm(StallType::class, $stall);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $stall
                ->setUpdatedAt(new \DateTimeImmutable())
                ->setIsPublished(false);

            $this->em->persist($stall);
            $this->em->flush();

            $this->addFlash('success', 'Your stall registration has been updated successfully!');

            return $this->redirectToRoute('app_stall_success', ['uuid' => $stall->getPrivateUuid()]);
        }

        return $this->render('stall/index.html.twig', [
            'isNew'   => false,
            'form'    => $form,
            'address' => $stall->getAddress(),
        ]);
    }

    #[Route('/api/stalls', name: 'app_stall_list', methods: ['GET'])]
    public function stallsGeoJson(): JsonResponse
    {
        /** @var Stall[] $stalls */
        $stalls = $this->em->getRepository(Stall::class)->findBy(['isPublished' => true]);

        $features = [];
        foreach ($stalls as $stall) {
            $addr = $stall->getAddress() ?? [];
            $lat = $addr['location']['lat'] ?? null;
            $lng = $addr['location']['lng'] ?? null;

            if ($lat === null || $lng === null) {
                continue;
            }

            $addressText = $addr['displayName'] ?? ($addr['formattedAddress'] ?? null);
            if ($addressText === null && isset($addr['addressComponents']) && is_array($addr['addressComponents'])) {
                $street = null; $number = null; $city = null; $postal = null;
                foreach ($addr['addressComponents'] as $component) {
                    if (!isset($component['types'][0], $component['long_name'])) {
                        continue;
                    }
                    $type = $component['types'][0];
                    switch ($type) {
                        case 'route': $street = $component['long_name']; break;
                        case 'street_number': $number = $component['long_name']; break;
                        case 'locality': $city = $component['long_name']; break;
                        case 'postal_code': $postal = $component['long_name']; break;
                    }
                }
                $parts = [];
                if ($street) {
                    $parts[] = trim($street . ' ' . ($number ?? ''));
                }
                if ($postal || $city) {
                    $parts[] = trim(($postal ? $postal . ' ' : '') . ($city ?? ''));
                }
                $addressText = implode(', ', array_filter($parts));
            }

            $features[] = [
                'type' => 'Feature',
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [(float)$lng, (float)$lat],
                ],
                'properties' => [
                    'address' => $addressText ?? '',
                    'information' => $stall->getInformation(),
                    'stallNumber' => $stall->getStallNumber(),
                ],
            ];
        }

        $data = [
            'type' => 'FeatureCollection',
            'features' => $features,
        ];

        return $this->json($data);
    }

    private function sendEmail(Stall $stall): void
    {
        $email = new NotificationEmail()
            ->from(new Address($_ENV['EMAIL_FROM_ADDRESS'], $_ENV['EMAIL_FROM_NAME']))
            ->to($stall->getEmail())
            ->subject('Waldenburger Hofflohmärkte 2025')
            ->htmlTemplate('email.html.twig')
            ->importance('')
            ->context(['stall' => $stall]);

        $this->mailer->send($email);
    }
}
