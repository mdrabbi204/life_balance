<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PrayerTimes\PrayerTimeCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
            'profile' => $request->user()->getProfile(),
            'options' => [
                'prayer_methods' => collect(PrayerTimeCalculator::METHODS)->map(fn ($m, $k) => ['value' => $k, 'label' => $m['name']])->values(),
                'asr_methods' => [['value' => 'Hanafi', 'label' => 'Hanafi (later Asr)'], ['value' => 'Standard', 'label' => "Shafi'i, Maliki, Hanbali"]],
                'high_lat_rules' => ['AngleBased', 'NightMiddle', 'OneSeventh', 'None'],
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $time = 'date_format:H:i';
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'email' => ['sometimes', 'required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($request->user()->id)],
            'wake_time' => "sometimes|$time", 'sleep_time' => "sometimes|$time",
            'office_start' => "sometimes|$time", 'office_end' => "sometimes|$time",
            'commute_minutes' => 'sometimes|integer|min:0|max:600',
            'transport' => 'sometimes|string|max:50',
            'morning_activity' => 'sometimes|string|max:100',
            'career_title' => 'sometimes|string|max:100',
            'tech_interests' => 'sometimes|array|max:40', 'tech_interests.*' => 'string|max:50',
            'bio' => 'sometimes|nullable|string|max:1000',
            'city' => 'sometimes|string|max:100', 'country' => 'sometimes|string|max:100',
            'latitude' => 'sometimes|numeric|between:-90,90', 'longitude' => 'sometimes|numeric|between:-180,180',
            'timezone' => 'sometimes|timezone:all',
            'prayer_method' => ['sometimes', Rule::in(array_keys(PrayerTimeCalculator::METHODS))],
            'asr_method' => 'sometimes|in:Hanafi,Standard',
            'high_lat_rule' => 'sometimes|in:AngleBased,NightMiddle,OneSeventh,None',
            'prayer_provider' => 'sometimes|in:local,aladhan',
            'prayer_adjustments' => 'sometimes|array', 'prayer_adjustments.*' => 'integer|between:-60,60',
            'prayer_duration_minutes' => 'sometimes|integer|min:5|max:90',
            'jumuah_duration_minutes' => 'sometimes|integer|min:15|max:180',
            'theme' => 'sometimes|in:light,dark,system',
            'score_weights' => 'sometimes|array', 'score_weights.*' => 'numeric|min:0|max:100',
            'goals' => 'sometimes|array', 'goals.*' => 'numeric|min:0|max:100000',
            'rest_days' => 'sometimes|array', 'rest_days.*' => 'integer|between:0,6',
        ]);

        $user = $request->user();
        $user->fill(array_intersect_key($data, array_flip(['name', 'email'])))->save();
        $profileData = array_diff_key($data, array_flip(['name', 'email']));
        $profile = $user->getProfile();
        if (isset($profileData['goals'])) {
            $profileData['goals'] = array_merge($profile->allGoals(), $profileData['goals']);
        }
        if (isset($profileData['score_weights'])) {
            $profileData['score_weights'] = array_merge($profile->weights(), $profileData['score_weights']);
        }
        if (isset($profileData['rest_days'])) {
            $profileData['rest_days'] = array_values(array_unique(array_map('intval', $profileData['rest_days'])));
        }
        $profile->fill($profileData)->save();

        return response()->json(['user' => $user->fresh()->load('profile')]);
    }

    public function avatar(Request $request): JsonResponse
    {
        $request->validate(['avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048']);
        $user = $request->user();
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }
        $user->update(['avatar_path' => $request->file('avatar')->store('avatars', 'public')]);

        return response()->json(['user' => $user->fresh()->load('profile')]);
    }

    public function removeAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);
        }

        return response()->json(['user' => $user->fresh()->load('profile')]);
    }
}
