<?php

namespace App\Form;

use App\Entity\Stall;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\CallbackTransformer;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\CollectionType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Callback;
use Symfony\Component\Validator\Constraints\Email;
use Symfony\Component\Validator\Constraints\IsTrue;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

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
            ->add('address', HiddenType::class, [
                'constraints' => [
                    new NotBlank([
                        'message' => 'Location data is required',
                    ]),
                    new Callback([
                        'callback' => [$this, 'validateLocationData'],
                    ]),
                ],
                'error_bubbling' => false,
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

        $builder->get('address')->addModelTransformer(new CallbackTransformer(
            function ($addressArray) {
                if (empty($addressArray)) {
                    return '';
                }
                return json_encode($addressArray);
            },
            function ($addressJson) {
                if (empty($addressJson)) {
                    return [];
                }
                return json_decode($addressJson, true);
            }
        ));
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Stall::class,
        ]);
    }

    public function validateLocationData(null|string|array $value, ExecutionContextInterface $context): void
    {
        if ($value === null) {
            return;
        }

        $data = is_array($value) ? $value : json_decode($value, true);

        if (!is_array($value) && json_last_error() !== JSON_ERROR_NONE) {
            $context->buildViolation('Location must be in valid JSON format')
                ->addViolation();
            return;
        }

        $this->validateRequiredFields($data, $context);
        $this->validateCoordinates($data, $context);
        $this->validateAddressComponents($data, $context);

    }


    private function validateRequiredFields(array $data, ExecutionContextInterface $context): void
    {
        if (!isset($data['id']) || empty($data['id'])) {
            $context->buildViolation('Location ID is required')
                ->addViolation();
        }
    }

    private function validateCoordinates(array $data, ExecutionContextInterface $context): void
    {
        if (!isset($data['location'])
            || !isset($data['location']['lat'])
            || !isset($data['location']['lng'])
        ) {
            $context->buildViolation('Location coordinates are required')
                ->addViolation();
        }
    }

    private function validateAddressComponents(array $data, ExecutionContextInterface $context): void
    {
        if (!isset($data['addressComponents']) || !is_array($data['addressComponents'])) {
            $context->buildViolation('Address components are missing or invalid')
                ->addViolation();

            return;
        }

        $requiredTypes = [
            'street_number' => 'Hausnummer ist in der Adresse erforderlich',
            'route'         => 'Straßenname ist in der Adresse erforderlich',
            'postal_code'   => 'Postleitzahl ist in der Adresse erforderlich',
        ];

        $foundTypes = [];

        foreach ($data['addressComponents'] as $component) {
            if (!isset($component['types']) || !is_array($component['types'])) {
                continue;
            }

            foreach ($component['types'] as $type) {
                if (array_key_exists($type, $requiredTypes)) {
                    $foundTypes[$type] = true;
                }
            }
        }

        foreach ($requiredTypes as $type => $message) {
            if (!isset($foundTypes[$type])) {
                $context->buildViolation($message)
                    ->addViolation();
            }
        }
    }
}
