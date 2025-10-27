'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { format, formatDistanceToNow } from 'date-fns';
import {
  FiClock,
  FiMapPin,
  FiSearch,
  FiTrendingUp,
  FiNavigation,
  FiRefreshCcw,
  FiUser,
  FiGlobe,
  FiAlertCircle,
  FiPlus,
  FiX,
  FiStar,
} from 'react-icons/fi';
import type { RideEstimate } from '@/types/ride';
import { getRecommendationsForCity, fuzzySearchLocations } from '@/data/locations';
import type { LocationRecommendation } from '@/data/locations';

type PickupField = { value: string };

type FormData = {
  pickupPoints: PickupField[];
  dropoff: string;
  departureTime: string;
};

type ServiceKey = RideEstimate['service'];

type UserProfile = {
  ok: boolean;
  ip: string;
  visits?: number;
  firstSeen?: string;
  lastSeen?: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  lat?: string | null;
  lng?: string | null;
  message?: string;
};

const SERVICE_META: Record<ServiceKey, { name: string; accent: string; badge: string; tagline: string }> = {
  uber: {
    name: 'Uber',
    accent: 'text-emerald-300',
    badge: 'from-emerald-400/70 to-emerald-500/30',
    tagline: 'Reliable cabs with upfront fares',
  },
  ola: {
    name: 'Ola',
    accent: 'text-amber-300',
    badge: 'from-amber-400/80 to-yellow-400/30',
    tagline: 'Popular in metros with surge protection',
  },
  rapido: {
    name: 'Rapido',
    accent: 'text-sky-300',
    badge: 'from-sky-400/80 to-blue-400/40',
    tagline: 'Fastest bike taxis for busy routes',
  },
};

const QUICK_ROUTES: Array<{ label: string; pickups: string[]; dropoff: string }> = [
  {
    label: 'Koramangala + Indiranagar → Bagmane Tech Park',
    pickups: ['Koramangala 5th Block', 'Indiranagar 100 Feet Road'],
    dropoff: 'Bagmane Tech Park',
  },
  {
    label: 'Bandra + Juhu → CSMIA T2',
    pickups: ['Bandra West', 'Juhu Scheme'],
    dropoff: 'Chhatrapati Shivaji Maharaj International Airport',
  },
  {
    label: 'Hauz Khas + Saket → IGI T3',
    pickups: ['Hauz Khas', 'Saket Select City Walk'],
    dropoff: 'Indira Gandhi International Airport T3',
  },
];

const MAX_PICKUPS = 3;

const formatInr = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const normaliseName = (value: string) => value.trim().toLowerCase();

const uniqueByName = (items: LocationRecommendation[]) => {
  const seen = new Set<string>();
  const result: LocationRecommendation[] = [];
  items.forEach((item) => {
    const key = normaliseName(item.name);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(item);
  });
  return result;
};

export default function RideEstimator() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userProfileError, setUserProfileError] = useState<string | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [estimates, setEstimates] = useState<RideEstimate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState<{ pickups: string[]; dropoff: string } | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({
    mode: 'onBlur',
    defaultValues: {
      pickupPoints: [{ value: '' }],
      dropoff: '',
      departureTime: '',
    },
  });

  const { fields: pickupFields, append, remove, replace } = useFieldArray({
    control,
    name: 'pickupPoints',
  });

  useEffect(() => {
    let active = true;

    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load user profile: ${response.status}`);
        }

        const payload = (await response.json()) as UserProfile;
        if (!active) {
          return;
        }

        if (payload.ok) {
          setUserProfile(payload);
          setUserProfileError(null);
        } else {
          setUserProfile(payload);
          setUserProfileError(
            payload.message ??
              'Personalised greeting is offline while we reach the database.',
          );
        }
      } catch (err) {
        if (!active) {
          return;
        }
        console.error(err);
        setUserProfileError('Personalised greeting is offline while we connect to the database.');
      } finally {
        if (active) {
          setIsUserLoading(false);
        }
      }
    };

    fetchUserProfile();

    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (formValues: FormData) => {
    setIsLoading(true);
    setError(null);

    const pickupList = (formValues.pickupPoints ?? [])
      .map((item) => item?.value?.trim())
      .filter((value): value is string => Boolean(value));

    if (pickupList.length === 0) {
      setIsLoading(false);
      setError('Add at least one pick-up point to plan your ride.');
      return;
    }

    try {
      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickups: pickupList,
          dropoff: formValues.dropoff,
          departureTime: formValues.departureTime || undefined,
          city: userProfile?.city,
        }),
      });

      const payload = (await response.json()) as { ok: boolean; estimates?: RideEstimate[]; message?: string };

      if (!response.ok || !payload.ok || !payload.estimates) {
        throw new Error(payload.message ?? 'Providers did not return any fares.');
      }

      setEstimates(payload.estimates);
      setLastSearch({ pickups: pickupList, dropoff: formValues.dropoff });
    } catch (err) {
      console.error(err);
      setError('Unable to load fares right now. Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  const bestDeal = useMemo(
    () =>
      estimates.reduce<RideEstimate | null>(
        (lowest, ride) => (lowest === null || ride.price < lowest.price ? ride : lowest),
        null,
      ),
    [estimates],
  );

  const fastestRide = useMemo(
    () =>
      estimates.reduce<RideEstimate | null>(
        (fastest, ride) => (fastest === null || ride.duration < fastest.duration ? ride : fastest),
        null,
      ),
    [estimates],
  );

  const premiumRide = useMemo(
    () =>
      estimates
        .filter((estimate) => estimate.price > (bestDeal?.price ?? 0))
        .sort((a, b) => b.price - a.price)[0] ?? null,
    [estimates, bestDeal],
  );

  const pickupValues = watch('pickupPoints');
  const dropoffValue = watch('dropoff');
  const departureTime = watch('departureTime');
  const hasResults = estimates.length > 0;
  const recommendations = useMemo(
    () => getRecommendationsForCity(userProfile?.city),
    [userProfile?.city],
  );
  const pickupRecommendationList = recommendations.pickups;
  const dropoffRecommendationList = recommendations.dropoffs;
  const pickupCombos = recommendations.pickupCombos;

  const selectedPickupNames = useMemo(
    () =>
      (pickupValues ?? [])
        .map((field) => field?.value?.trim())
        .filter((value): value is string => Boolean(value)),
    [pickupValues],
  );

  const pickupSuggestionForValue = (value: string) => {
    const used = new Set(selectedPickupNames.map(normaliseName));
    const baseMatches = pickupRecommendationList.filter((item) => {
      if (used.has(normaliseName(item.name))) {
        return false;
      }
      if (!value.trim()) {
        return true;
      }
      const haystack = `${item.name} ${item.address} ${(item.tags ?? []).join(' ')}`.toLowerCase();
      return haystack.includes(value.trim().toLowerCase());
    });

    const fuzzy =
      value.trim().length > 2
        ? fuzzySearchLocations(value, 5).filter(
            (item) => !used.has(normaliseName(item.name)) && normaliseName(item.name) !== normaliseName(value),
          )
        : [];

    return uniqueByName([...baseMatches, ...fuzzy]).slice(0, 3);
  };

  const dropoffSuggestions = useMemo(() => {
    const used = normaliseName(dropoffValue ?? '');

    const matches = dropoffRecommendationList.filter((item) => {
      if (!dropoffValue?.trim()) {
        return true;
      }
      const haystack = `${item.name} ${item.address} ${(item.tags ?? []).join(' ')}`.toLowerCase();
      return haystack.includes(dropoffValue.trim().toLowerCase());
    });

    const fuzzy =
      dropoffValue.trim().length > 2
        ? fuzzySearchLocations(dropoffValue, 6).filter(
            (item) => normaliseName(item.name) !== used && normaliseName(item.name) !== normaliseName(dropoffValue),
          )
        : [];

    return uniqueByName([...matches, ...fuzzy]).slice(0, 5);
  }, [dropoffRecommendationList, dropoffValue]);
  const userLocationLabel = useMemo(() => {
    if (!userProfile) {
      return null;
    }
    const parts = [userProfile.city, userProfile.region, userProfile.country].filter(
      (value): value is string => Boolean(value),
    );
    return parts.length > 0 ? parts.join(', ') : null;
  }, [userProfile]);

  const userLastSeenLabel = useMemo(() => {
    if (!userProfile?.lastSeen) {
      return null;
    }
    return formatDistanceToNow(new Date(userProfile.lastSeen), { addSuffix: true });
  }, [userProfile?.lastSeen]);

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950" />
      <div className="absolute left-1/2 top-[-18rem] -z-10 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-cyan-500/0 blur-3xl" />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-20 pt-20 sm:px-6 lg:px-8">
        <header className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-white/70 backdrop-blur">
            <FiTrendingUp className="h-4 w-4" />
            Live fare signals for Indian metros
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Compare Uber, Ola & Rapido fares before you book
          </h1>
          <p className="text-lg text-white/70">
            Built for riders in India. Get a quick snapshot of the best deals across popular cab
            and bike taxi operators with smart insights on what&apos;s faster, calmer, or more
            premium for your route.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_80px_-28px_rgba(16,185,129,0.35)] backdrop-blur">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-white">Pick-up points</label>
                    <span className="text-xs uppercase tracking-wide text-white/40">
                      Plan up to {MAX_PICKUPS} stops
                    </span>
                  </div>

                  {pickupFields.map((field, index) => {
                    const inputId = `pickup-${index}`;
                    const currentValue = pickupValues?.[index]?.value ?? '';
                    const suggestions = pickupSuggestionForValue(currentValue);
                    return (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="relative w-full">
                            <FiMapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                            <input
                              id={inputId}
                              type="text"
                              placeholder={index === 0 ? 'e.g. Koramangala 5th Block' : 'Add another pickup'}
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-base text-white placeholder-white/40 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed"
                              {...register(`pickupPoints.${index}.value` as const, {
                                required: 'Pick-up point is required',
                              })}
                            />
                          </div>
                          {pickupFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/60 transition hover:border-rose-400/40 hover:text-rose-200"
                              aria-label={`Remove pickup ${index + 1}`}
                            >
                              <FiX className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {errors.pickupPoints?.[index]?.value && (
                          <p className="text-sm text-rose-300">
                            {errors.pickupPoints[index]?.value?.message}
                          </p>
                        )}
                        {suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {suggestions.map((suggestion) => (
                              <button
                                type="button"
                                key={`${field.id}-suggestion-${suggestion.name}`}
                                onClick={() =>
                                  setValue(`pickupPoints.${index}.value`, suggestion.name, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  })
                                }
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs text-white/75 transition hover:border-emerald-400/60 hover:text-white"
                              >
                                <FiStar className="h-3 w-3 text-emerald-300" />
                                {suggestion.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (pickupFields.length >= MAX_PICKUPS) return;
                        append({ value: '' });
                      }}
                      disabled={pickupFields.length >= MAX_PICKUPS}
                      className="inline-flex items-center gap-2 rounded-full border border-dashed border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-emerald-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiPlus className="h-4 w-4" />
                      Add another pick-up
                    </button>
                    <span className="text-xs text-white/40">
                      We balance time and price across all your stops.
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="dropoff" className="text-sm font-medium text-white">
                    Drop-off point
                  </label>
                  <div className="relative">
                    <FiNavigation className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <input
                      id="dropoff"
                      type="text"
                      placeholder="e.g. Manyata Tech Park"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-base text-white placeholder-white/40 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed"
                      {...register('dropoff', { required: 'Drop-off point is required' })}
                    />
                  </div>
                  {errors.dropoff && (
                    <p className="text-sm text-rose-300">{errors.dropoff.message}</p>
                  )}
                  {dropoffSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {dropoffSuggestions.map((suggestion) => (
                        <button
                          type="button"
                          key={`dropoff-${suggestion.name}`}
                          onClick={() =>
                            setValue('dropoff', suggestion.name, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs text-white/75 transition hover:border-emerald-400/60 hover:text-white"
                        >
                          <FiStar className="h-3 w-3 text-emerald-300" />
                          {suggestion.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="departureTime" className="text-sm font-medium text-white">
                    When do you want to leave?
                  </label>
                  <div className="relative">
                    <FiClock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <input
                      id="departureTime"
                      type="datetime-local"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-base text-white placeholder-white/40 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed [color-scheme:dark]"
                      {...register('departureTime')}
                    />
                  </div>
                  <p className="text-sm text-white/50">
                    {departureTime
                      ? `We will project fares for ${format(new Date(departureTime), 'd MMM, h:mm a')}.`
                      : 'Leave empty to use the current time.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <FiStar className="h-4 w-4 text-emerald-300" />
                    Smart pickup bundles for you
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {pickupCombos.map((combo) => (
                      <button
                        key={combo.description}
                        type="button"
                        onClick={() => {
                          const picks = combo.pickups.slice(0, MAX_PICKUPS);
                          replace(picks.length > 0 ? picks.map((value) => ({ value })) : [{ value: '' }]);
                          setValue('dropoff', combo.dropoff, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-left text-sm text-white/80 transition hover:border-emerald-400/60 hover:bg-white/[0.08] hover:text-white"
                      >
                        <p className="font-semibold text-white">{combo.description}</p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-white/40">
                          Pick-ups
                        </p>
                        <p className="text-sm text-white/70">{combo.pickups.join(' • ')}</p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-white/40">
                          Drop-off
                        </p>
                        <p className="text-sm text-white/70">{combo.dropoff}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-white">Popular metro presets</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {QUICK_ROUTES.map((route) => (
                      <button
                        key={route.label}
                        type="button"
                        onClick={() => {
                          const picks = route.pickups.slice(0, MAX_PICKUPS);
                          replace(picks.length > 0 ? picks.map((value) => ({ value })) : [{ value: '' }]);
                          setValue('dropoff', route.dropoff, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm text-white/80 transition hover:border-emerald-400/60 hover:text-white"
                      >
                        {route.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isLoading || isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-base font-semibold text-emerald-950 shadow-[0_12px_40px_-10px_rgba(52,211,153,0.6)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="-ml-0.5 h-5 w-5 animate-spin text-emerald-900"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          className="opacity-30"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-90"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Crunching fares…
                    </>
                  ) : (
                    <>
                      <FiSearch className="-ml-0.5 h-5 w-5" />
                      Show estimates
                    </>
                  )}
                </button>

                {hasResults && (
                  <button
                    type="button"
                    onClick={() => {
                      setEstimates([]);
                      setLastSearch(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
                  >
                    <FiRefreshCcw className="h-4 w-4" />
                    Clear results
                  </button>
                )}
              </div>
            </form>
          </div>

          <aside className="flex flex-col gap-4">
            {isUserLoading && (
              <div className="animate-pulse rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="h-4 w-28 rounded-full bg-white/10" />
                <div className="mt-4 space-y-3">
                  <div className="h-3 w-3/4 rounded-full bg-white/10" />
                  <div className="h-3 w-2/3 rounded-full bg-white/10" />
                  <div className="h-3 w-1/2 rounded-full bg-white/10" />
                </div>
              </div>
            )}

            {!isUserLoading && userProfile && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-6 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-200">
                    <FiUser className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Personalised view</p>
                    <p className="text-lg font-semibold text-white">
                      {userProfile.city ? `Namaste from ${userProfile.city}` : 'Namaste 👋'}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 space-y-3 text-sm text-white/70">
                  <div className="flex items-center justify-between">
                    <dt className="text-white/50">Your IP fingerprint</dt>
                    <dd className="font-mono text-xs text-white/80">{userProfile.ip}</dd>
                  </div>

                  {userLocationLabel && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-2 text-white/50">
                        <FiGlobe className="h-4 w-4" />
                        Location
                      </dt>
                      <dd className="text-right text-white/80">{userLocationLabel}</dd>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <dt className="text-white/50">Visits tracked</dt>
                    <dd className="font-semibold text-white">{userProfile.visits ?? 1}</dd>
                  </div>

                  {userLastSeenLabel && (
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <dt>Last seen</dt>
                      <dd>{userLastSeenLabel}</dd>
                    </div>
                  )}
                </dl>

                {!userProfile.ok && userProfileError && (
                  <p className="mt-4 flex items-center gap-2 text-xs text-amber-200/80">
                    <FiAlertCircle className="h-4 w-4" />
                    {userProfileError}
                  </p>
                )}
              </div>
            )}

            {!isUserLoading && !userProfile && userProfileError && (
              <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
                <div className="flex items-center gap-2 font-medium">
                  <FiAlertCircle className="h-4 w-4" />
                  {userProfileError}
                </div>
                <p className="mt-3 text-xs text-rose-100/70">
                  Set the <code className="font-mono">POSTGRES_URL</code> secret in Vercel to enable
                  anonymous user tracking.
                </p>
              </div>
            )}

            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-emerald-100">Smart insights</h2>
              <p className="mt-1 text-sm text-emerald-100/70">
                We highlight the options that balance price, travel time, and comfort for India’s
                most-used ride services.
              </p>

              <dl className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs uppercase tracking-wide text-white/60">Best deal</dt>
                  <dd className="mt-2 text-sm text-white">
                    {bestDeal ? (
                      <>
                        {SERVICE_META[bestDeal.service].name}{' '}
                        <span className="text-white/70">({bestDeal.productName})</span>
                        <div className="mt-1 text-2xl font-semibold text-white">
                          {formatInr(bestDeal.price)}
                        </div>
                      </>
                    ) : (
                      'Run a search to surface the sweetest fare.'
                    )}
                  </dd>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs uppercase tracking-wide text-white/60">Fastest arrival</dt>
                  <dd className="mt-2 text-sm text-white">
                    {fastestRide ? (
                      <>
                        {SERVICE_META[fastestRide.service].name}{' '}
                        <span className="text-white/70">({fastestRide.productName})</span>
                        <div className="mt-1 flex items-baseline gap-2 text-white">
                          <span className="text-2xl font-semibold">{fastestRide.duration} min</span>
                          <span className="text-xs text-white/60">
                            ETA {format(new Date(fastestRide.arrivalTime), 'h:mm a')}
                          </span>
                        </div>
                      </>
                    ) : (
                      'We will call out the quickest ride here.'
                    )}
                  </dd>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs uppercase tracking-wide text-white/60">Premium comfort</dt>
                  <dd className="mt-2 text-sm text-white">
                    {premiumRide ? (
                      <>
                        {SERVICE_META[premiumRide.service].name}{' '}
                        <span className="text-white/70">({premiumRide.productName})</span>
                        <div className="mt-1 text-2xl font-semibold text-white">
                          {formatInr(premiumRide.price)}
                        </div>
                      </>
                    ) : (
                      'Expect to see luxury picks such as Uber Premier here.'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {lastSearch && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/70 backdrop-blur">
                <h3 className="text-base font-semibold text-white">Current route</h3>
                <div className="mt-3 space-y-1">
                  <span className="text-white/80">Pick-ups:</span>
                  <ul className="mt-1 list-inside list-disc text-sm text-white/70">
                    {lastSearch.pickups.map((pickup) => (
                      <li key={pickup}>{pickup}</li>
                    ))}
                  </ul>
                </div>
                <p className="mt-2">
                  <span className="text-white/80">To:</span> {lastSearch.dropoff}
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide text-white/40">
                  Indicative fares shown in INR. Confirm inside the app before booking.
                </p>
              </div>
            )}
          </aside>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        )}

        {hasResults && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Matching rides</h2>
              <span className="text-sm text-white/60">
                Sorted by total fare · Tap a card to view more in the provider app
              </span>
            </div>

            <ul className="space-y-4">
              {estimates
                .slice()
                .sort((a, b) => a.price - b.price)
                .map((estimate) => {
                  const meta = SERVICE_META[estimate.service];
                  const isBestDeal =
                    bestDeal &&
                    bestDeal.service === estimate.service &&
                    bestDeal.productName === estimate.productName;
                  const isFastest =
                    fastestRide &&
                    fastestRide.service === estimate.service &&
                    fastestRide.productName === estimate.productName;

                  return (
                    <li
                      key={`${estimate.service}-${estimate.productName}-${estimate.price}`}
                      className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 transition hover:border-emerald-400/60 hover:bg-white/[0.09]"
                    >
                      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-1 items-center gap-5">
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.badge} text-lg font-bold text-white shadow-lg shadow-emerald-500/10`}
                          >
                            {meta.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-lg font-semibold text-white">{meta.name}</h3>
                              <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70">
                                {estimate.productName}
                              </span>
                              {isBestDeal && (
                                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-medium text-emerald-200">
                                  Best deal
                                </span>
                              )}
                              {isFastest && !isBestDeal && (
                                <span className="rounded-full bg-sky-400/20 px-3 py-1 text-xs font-medium text-sky-200">
                                  Fastest arrival
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-white/60">{meta.tagline}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 text-sm text-white/70 sm:flex sm:items-center sm:gap-10">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-white/40">Fare</p>
                            <p className="mt-1 text-2xl font-semibold text-white">
                              {formatInr(estimate.price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-white/40">
                              Travel time
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white">
                              {estimate.duration} min
                            </p>
                            <p className="text-xs text-white/50">
                              ETA {format(new Date(estimate.arrivalTime), 'h:mm a')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-white/40">
                              Distance
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white">
                              {estimate.distance.toFixed(1)} km
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
