<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\DefaultDataService;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Creates the demo account with the default LifeBalance profile, habits,
     * schedule, learning roadmap, reminders and workout templates.
     *
     * Optional sample history (for exploring charts): php artisan db:seed --class=DemoHistorySeeder
     */
    public function run(DefaultDataService $defaults): void
    {
        $user = User::firstOrCreate(
            ['email' => 'demo@lifebalance.test'],
            ['name' => 'Demo User', 'password' => 'password'],
        );
        $defaults->seedFor($user);
    }
}
