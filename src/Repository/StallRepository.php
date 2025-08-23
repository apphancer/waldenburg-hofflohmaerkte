<?php

namespace App\Repository;

use App\Entity\Stall;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Stall>
 */
class StallRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Stall::class);
    }

    /**
     * Checks if any Stall exists with the given formattedAddress in its JSON address field.
     * This is implemented in PHP for portability across DB platforms.
     */
    public function existsByFormattedAddress(string $formattedAddress, ?int $excludeId = null): bool
    {
        $formattedAddress = trim($formattedAddress);
        if ($formattedAddress === '') {
            return false;
        }

        // Fetch candidates. To keep it simple and portable, we fetch all and filter in PHP.
        // If the dataset grows, consider adding a dedicated column or DB-specific JSON query.
        $qb = $this->createQueryBuilder('s');
        if ($excludeId !== null) {
            $qb->andWhere('s.id != :excludeId')->setParameter('excludeId', $excludeId);
        }
        /** @var Stall[] $stalls */
        $stalls = $qb->getQuery()->getResult();

        $needle = mb_strtolower($formattedAddress);
        foreach ($stalls as $stall) {
            $addr = $stall->getAddress();
            if (!is_array($addr)) {
                continue;
            }
            $candidate = $addr['formattedAddress'] ?? null;
            if (!is_string($candidate)) {
                continue;
            }
            if (mb_strtolower(trim($candidate)) === $needle) {
                return true;
            }
        }

        return false;
    }
}
