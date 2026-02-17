export const boats = [
    { id: 'boat_1', name: 'Logimar Express I', capacity: 220, type: 'Catamaran Rapide' },
    { id: 'boat_2', name: 'Logimar Queen', capacity: 350, type: 'Ferry Mixte' },
];

export const destinations = [
    { id: 'lbv', name: 'Libreville', code: 'LBV' },
    { id: 'pog', name: 'Port-Gentil', code: 'POG' },
];

export const trips = [
    {
        id: 'trip_101',
        boatId: 'boat_1',
        origin: 'LBV',
        destination: 'POG',
        date: '2026-03-10', // Date future pour la démo
        departureTime: '07:30',
        arrivalTime: '10:30',
        basePrice: 35000,
        currentPrice: 35000, // Yield not active yet
        seatsAvailable: 145,
        status: 'scheduled'
    },
    {
        id: 'trip_102',
        boatId: 'boat_2',
        origin: 'POG',
        destination: 'LBV',
        date: '2026-03-10',
        departureTime: '14:00',
        arrivalTime: '18:00',
        basePrice: 30000,
        currentPrice: 28000, // Promo Yield applied
        seatsAvailable: 42, // High demand
        status: 'scheduled'
    }
];
