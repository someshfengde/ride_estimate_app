export type LocationRecommendation = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  tags?: string[];
};

type CityRecommendation = {
  pickups: LocationRecommendation[];
  dropoffs: LocationRecommendation[];
  pickupCombos: Array<{ pickups: string[]; dropoff: string; description: string }>;
};

const CITY_MAP: Record<string, CityRecommendation> = {
  Bengaluru: {
    pickups: [
      {
        name: 'Koramangala 5th Block',
        address: 'Koramangala 5th Block, Bengaluru',
        lat: 12.934533,
        lng: 77.625679,
        tags: ['startup hub', 'cafes'],
      },
      {
        name: 'Indiranagar 100 Feet Road',
        address: '100 Feet Road, Indiranagar, Bengaluru',
        lat: 12.971891,
        lng: 77.641151,
        tags: ['nightlife', 'restaurants'],
      },
      {
        name: 'HSR Layout Sector 6',
        address: 'HSR Layout, Sector 6, Bengaluru',
        lat: 12.908135,
        lng: 77.647607,
        tags: ['residential', 'families'],
      },
      {
        name: 'Whitefield ITPL',
        address: 'ITPL Main Road, Whitefield, Bengaluru',
        lat: 12.985,
        lng: 77.737,
        tags: ['tech park'],
      },
      {
        name: 'BTM Layout 2nd Stage',
        address: 'BTM Layout 2nd Stage, Bengaluru',
        lat: 12.914141,
        lng: 77.610116,
        tags: ['student area'],
      },
    ],
    dropoffs: [
      {
        name: 'Manyata Tech Park',
        address: 'Manyata Embassy Business Park, Thanisandra, Bengaluru',
        lat: 13.047985,
        lng: 77.621934,
        tags: ['tech park'],
      },
      {
        name: 'Bagmane Tech Park',
        address: 'Bagmane Tech Park, CV Raman Nagar, Bengaluru',
        lat: 12.978369,
        lng: 77.663034,
        tags: ['tech park'],
      },
      {
        name: 'Kempegowda International Airport',
        address: 'Kempegowda International Airport, Bengaluru',
        lat: 13.198889,
        lng: 77.706111,
        tags: ['airport'],
      },
      {
        name: 'MG Road',
        address: 'MG Road, Bengaluru',
        lat: 12.97464,
        lng: 77.60939,
        tags: ['downtown'],
      },
    ],
    pickupCombos: [
      {
        description: 'Koramangala → Indiranagar → Bagmane Tech Park',
        pickups: ['Koramangala 5th Block', 'Indiranagar 100 Feet Road'],
        dropoff: 'Bagmane Tech Park',
      },
      {
        description: 'HSR → BTM → Manyata morning shuttle',
        pickups: ['HSR Layout Sector 6', 'BTM Layout 2nd Stage'],
        dropoff: 'Manyata Tech Park',
      },
      {
        description: 'Whitefield coworkers airport run',
        pickups: ['Whitefield ITPL', 'Indiranagar 100 Feet Road'],
        dropoff: 'Kempegowda International Airport',
      },
    ],
  },
  Mumbai: {
    pickups: [
      {
        name: 'Bandra West',
        address: 'Pali Hill, Bandra West, Mumbai',
        lat: 19.060531,
        lng: 72.827416,
        tags: ['suburb', 'nightlife'],
      },
      {
        name: 'Juhu Scheme',
        address: 'Juhu Scheme, Mumbai',
        lat: 19.103386,
        lng: 72.826523,
        tags: ['beach', 'residential'],
      },
      {
        name: 'Lower Parel One Indiabulls',
        address: 'One Indiabulls Center, Lower Parel, Mumbai',
        lat: 18.9997,
        lng: 72.8258,
        tags: ['business district'],
      },
      {
        name: 'Powai Hiranandani',
        address: 'Hiranandani Gardens, Powai, Mumbai',
        lat: 19.1176,
        lng: 72.9071,
        tags: ['tech hub'],
      },
      {
        name: 'Andheri Lokhandwala',
        address: 'Lokhandwala Complex, Andheri West, Mumbai',
        lat: 19.1431,
        lng: 72.8324,
        tags: ['residential'],
      },
    ],
    dropoffs: [
      {
        name: 'Chhatrapati Shivaji Maharaj International Airport',
        address: 'CSMIA Airport, Mumbai',
        lat: 19.0953,
        lng: 72.8559,
        tags: ['airport'],
      },
      {
        name: 'Bandra Kurla Complex',
        address: 'Bandra Kurla Complex, Mumbai',
        lat: 19.063,
        lng: 72.8363,
        tags: ['business district'],
      },
      {
        name: 'Nariman Point',
        address: 'Nariman Point, Mumbai',
        lat: 18.9256,
        lng: 72.8215,
        tags: ['downtown'],
      },
      {
        name: 'Mindspace Malad',
        address: 'Mindspace, Malad West, Mumbai',
        lat: 19.1765,
        lng: 72.8363,
        tags: ['IT park'],
      },
    ],
    pickupCombos: [
      {
        description: 'Bandra coworker morning run',
        pickups: ['Bandra West', 'Lower Parel One Indiabulls'],
        dropoff: 'Bandra Kurla Complex',
      },
      {
        description: 'Northwest airport loop',
        pickups: ['Andheri Lokhandwala', 'Juhu Scheme'],
        dropoff: 'Chhatrapati Shivaji Maharaj International Airport',
      },
      {
        description: 'Powai techie express',
        pickups: ['Powai Hiranandani', 'Bandra West'],
        dropoff: 'Bandra Kurla Complex',
      },
    ],
  },
  Delhi: {
    pickups: [
      {
        name: 'Hauz Khas',
        address: 'Hauz Khas, New Delhi',
        lat: 28.5494,
        lng: 77.2001,
        tags: ['nightlife'],
      },
      {
        name: 'Gurugram Cyber City',
        address: 'DLF Cyber City, Gurugram',
        lat: 28.4941,
        lng: 77.0941,
        tags: ['corporate'],
      },
      {
        name: 'Saket Select City Walk',
        address: 'Select CityWalk Mall, Saket, New Delhi',
        lat: 28.5286,
        lng: 77.2198,
        tags: ['shopping'],
      },
      {
        name: 'Connaught Place',
        address: 'Connaught Place, New Delhi',
        lat: 28.628,
        lng: 77.218,
        tags: ['downtown'],
      },
      {
        name: 'Noida Sector 62',
        address: 'Sector 62, Noida',
        lat: 28.6304,
        lng: 77.3723,
        tags: ['tech park'],
      },
    ],
    dropoffs: [
      {
        name: 'Indira Gandhi International Airport T3',
        address: 'IGI Airport Terminal 3, New Delhi',
        lat: 28.5562,
        lng: 77.1000,
        tags: ['airport'],
      },
      {
        name: 'Cyber Hub',
        address: 'Cyber Hub, Gurugram',
        lat: 28.4975,
        lng: 77.0904,
        tags: ['food court'],
      },
      {
        name: 'DLF Downtown',
        address: 'DLF Downtown, Gurugram',
        lat: 28.4452,
        lng: 77.1025,
        tags: ['business district'],
      },
      {
        name: 'Noida Film City',
        address: 'Film City, Sector 16A, Noida',
        lat: 28.5687,
        lng: 77.3345,
        tags: ['media hub'],
      },
    ],
    pickupCombos: [
      {
        description: 'South Delhi airport hop',
        pickups: ['Hauz Khas', 'Saket Select City Walk'],
        dropoff: 'Indira Gandhi International Airport T3',
      },
      {
        description: 'Cyber city express',
        pickups: ['Gurugram Cyber City', 'Connaught Place'],
        dropoff: 'Cyber Hub',
      },
      {
        description: 'Noida tech corridor',
        pickups: ['Noida Sector 62', 'Hauz Khas'],
        dropoff: 'Noida Film City',
      },
    ],
  },
};

const FALLBACK_CITY: CityRecommendation = {
  pickups: [
    {
      name: 'City Centre',
      address: 'Central Business District',
      lat: 0,
      lng: 0,
    },
    {
      name: 'Main Transit Hub',
      address: 'Main Transit Hub',
      lat: 0,
      lng: 0,
    },
  ],
  dropoffs: [
    {
      name: 'International Airport',
      address: 'International Airport',
      lat: 0,
      lng: 0,
    },
  ],
  pickupCombos: [
    {
      description: 'City centre to airport shuttle',
      pickups: ['City Centre', 'Main Transit Hub'],
      dropoff: 'International Airport',
    },
  ],
};

export const listSupportedCities = () => Object.keys(CITY_MAP);

export const getCityKey = (city?: string | null) => {
  if (!city) {
    return null;
  }
  const match = listSupportedCities().find(
    (c) => c.toLowerCase() === city.toLowerCase().trim(),
  );
  return match ?? null;
};

export const getRecommendationsForCity = (city?: string | null) => {
  const key = getCityKey(city);
  if (key) {
    return CITY_MAP[key];
  }
  return FALLBACK_CITY;
};

export const findLocationByName = (name: string) => {
  const search = name.trim().toLowerCase();
  for (const city of Object.values(CITY_MAP)) {
    for (const rec of [...city.pickups, ...city.dropoffs]) {
      if (rec.name.toLowerCase() === search || rec.address.toLowerCase() === search) {
        return rec;
      }
    }
  }
  return null;
};

export const fuzzySearchLocations = (query: string, limit = 5) => {
  if (!query.trim()) {
    return [];
  }
  const needle = query.trim().toLowerCase();
  const matches: LocationRecommendation[] = [];

  for (const city of Object.values(CITY_MAP)) {
    for (const rec of [...city.pickups, ...city.dropoffs]) {
      const haystack = `${rec.name} ${rec.address} ${(rec.tags ?? []).join(' ')}`.toLowerCase();
      if (haystack.includes(needle)) {
        matches.push(rec);
      }
    }
  }

  return matches.slice(0, limit);
};
