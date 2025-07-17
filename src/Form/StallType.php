<?php

namespace App\Form;

use App\Entity\Stall;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\CollectionType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Email;
use Symfony\Component\Validator\Constraints\IsTrue;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;

class StallType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('email', EmailType::class, [
                'constraints' => [
                    new NotBlank([
                        'message' => 'Please enter an email address',
                    ]),
                    new Email([
                        'message' => 'Please enter a valid email address',
                    ]),
                ],
            ])
            ->add('fullName', TextType::class, [
                'constraints' => [
                    new NotBlank([
                        'message' => 'Please enter your full name',
                    ]),
                ],
            ])
            ->add('information', TextType::class, [
                'label'       => 'Öffentliche Informationen',
                'attr'        => [
                    'maxlength'   => 70,
                    'placeholder' => 'Verkaufte Artikel, z. B. Kleidung, Trödel, Pommes (freiwillig)',
                ],
                'required'    => false,
                'constraints' => [
                    new Length([
                        'max'        => 70,
                        'maxMessage' => 'Die Information darf maximal {{ limit }} Zeichen lang sein',
                    ]),
                ],
            ])
            ->add('stallNumber', IntegerType::class, [
                'constraints' => [
                    new NotBlank([
                        'message' => 'Please enter a stall number',
                    ]),
                ],
                'data'        => 1,
                'attr'        => [
                    'min' => 1,
                ],
            ])
            ->add('location', HiddenType::class, [
                'mapped' => false,
            ])
            ->add('address', CollectionType::class, [
                'entry_type'    => TextType::class,
                'allow_add'     => true,
                'prototype'     => true,
                'entry_options' => [
                    'constraints' => [
                        new NotBlank([
                            'message' => 'Please enter an address',
                        ]),
                    ],
                ],
            ])
            ->add('comments', TextareaType::class, [
                'label'    => 'Kommentare',
                'attr'     => [
                    'placeholder' => 'Interne Kommentare, nicht öffentlich (freiwillig)',
                ],
                'required' => false,
            ])
            ->add('agreeTerms', CheckboxType::class, [
                'mapped'      => false,
                'constraints' => [
                    new IsTrue([
                        'message' => 'You must agree to our terms and privacy policy.',
                    ]),
                ],
                'label'       => 'I agree to the terms of service and privacy policy',
                'required'    => true,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Stall::class,
        ]);
    }
}
