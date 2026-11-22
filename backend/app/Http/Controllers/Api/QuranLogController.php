<?php

namespace App\Http\Controllers\Api;

use App\Models\QuranLog;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuranLogController extends CrudController
{
    protected string $model = QuranLog::class;
    protected array $searchable = ['notes'];

    protected function rules(Request $request, ?Model $record = null): array
    {
        return [
            'date' => $this->req($record).'|date',
            'pages_read' => $this->req($record).'|integer|min:0|max:604',
            'surah_number' => 'nullable|integer|between:1,114',
            'ayah_from' => 'nullable|integer|min:1|max:286',
            'ayah_to' => 'nullable|integer|min:1|max:286|gte:ayah_from',
            'minutes' => 'nullable|integer|min:0|max:1440',
            'notes' => 'nullable|string|max:5000',
        ];
    }

    /** Reading streak (consecutive days with reading, today optional) and 30-day history. */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->getProfile();
        $today = Carbon::now($profile->timezone)->toDateString();
        $days = QuranLog::ownedBy($user->id)->where('date', '>=', Carbon::parse($today)->subDays(365))
            ->selectRaw('date, SUM(pages_read) as pages, SUM(minutes) as minutes')->groupBy('date')->get()
            ->mapWithKeys(fn ($r) => [Carbon::parse($r->date)->toDateString() => ['pages' => (int) $r->pages, 'minutes' => (int) $r->minutes]]);

        $streak = 0;
        $d = Carbon::parse($today);
        if (! isset($days[$today])) {
            $d->subDay();
        }
        while (isset($days[$d->toDateString()]) && $days[$d->toDateString()]['pages'] > 0) {
            $streak++;
            $d->subDay();
        }
        $best = 0; $run = 0;
        for ($x = Carbon::parse($today)->subDays(365); $x->toDateString() <= $today; $x->addDay()) {
            $run = (($days[$x->toDateString()]['pages'] ?? 0) > 0) ? $run + 1 : 0;
            $best = max($best, $run);
        }

        $history = collect(range(29, 0))->map(function ($i) use ($today, $days, $profile) {
            $date = Carbon::parse($today)->subDays($i)->toDateString();
            $pages = $days[$date]['pages'] ?? 0;

            return ['date' => $date, 'pages' => $pages, 'minutes' => $days[$date]['minutes'] ?? 0, 'goal_met' => $pages >= $profile->goal('quran_pages')];
        });

        return response()->json([
            'streak' => $streak,
            'best_streak' => $best,
            'goal' => (int) $profile->goal('quran_pages'),
            'today_pages' => $days[$today]['pages'] ?? 0,
            'total_pages_30' => $history->sum('pages'),
            'total_pages_year' => $days->sum('pages'),
            'history' => $history,
            'last_position' => QuranLog::ownedBy($user->id)->whereNotNull('surah_number')->orderByDesc('date')->orderByDesc('id')->first(['surah_number', 'ayah_to', 'date']),
        ]);
    }
}
