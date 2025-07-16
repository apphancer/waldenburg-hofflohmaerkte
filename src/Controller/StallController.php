<?php

namespace App\Controller;

use App\Entity\Stall;
use App\Form\StallType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Ulid;

final class StallController extends AbstractController
{

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('/stall/create', name: 'app_stall_create')]
    public function index(Request $request): Response
    {
        $stall = new Stall();

        $form = $this->createForm(StallType::class, $stall);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $stall
                ->setPublicUuid(new Ulid()->toBase32())
                ->setPrivateUuid(new Ulid()->toBase32())
                ->setCreatedAt(new \DateTimeImmutable());

            $this->em->persist($stall);
            $this->em->flush();

            $this->addFlash('success', 'Your stall registration has been submitted successfully!');

            return $this->redirectToRoute('app_stall_create');
        }


        return $this->render('stall/index.html.twig', [
            'form' => $form,
        ]);
    }
}
