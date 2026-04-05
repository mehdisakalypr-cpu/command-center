/**
 * THE ESTATE — API Layer
 * Simulates Booking.com Demand API + Amadeus Hotel API
 * Provides a unified HotelAPIClient for the platform
 */

'use strict';

/* ─────────────────────────────────────────────
   CONFIGURATION
───────────────────────────────────────────── */
const API_CONFIG = {
  booking: {
    baseUrl: 'https://distribution-xml.booking.com/2.9/json',
    clientId: 'THE_ESTATE_CLIENT_001',
    secret: '••••••••••••••••',
    version: '2.9',
  },
  amadeus: {
    baseUrl: 'https://api.amadeus.com/v3',
    clientId: 'THE_ESTATE_AMADEUS_KEY',
    secret: '••••••••••••••••',
  },
  simulateLatency: { min: 180, max: 620 },
  errorRate: 0.03, // 3% simulated network error rate
};

/* ─────────────────────────────────────────────
   MOCK DATA — Hotel Inventory
───────────────────────────────────────────── */
const HOTEL_INVENTORY = [
  // ACCOR
  { id: 'H001', name: 'Sofitel Paris Le Faubourg', group: 'Accor', brand: 'Sofitel', city: 'Paris', country: 'FR', stars: 5, lat: 48.8698, lng: 2.3218, units: 3, roomTypes: ['Junior Suite','Deluxe Suite','Prestige Suite'], adr: 980, currency: 'EUR', bookingId: 'BK_10001', amadeusId: 'AMH_PA001' },
  { id: 'H002', name: 'Raffles Singapore', group: 'Accor', brand: 'Raffles', city: 'Singapore', country: 'SG', stars: 5, lat: 1.2948, lng: 103.8517, units: 2, roomTypes: ['Palm Court Suite','Courtyard Suite'], adr: 1450, currency: 'SGD', bookingId: 'BK_10002', amadeusId: 'AMH_SG001' },
  { id: 'H003', name: 'Fairmont Le Château Frontenac', group: 'Accor', brand: 'Fairmont', city: 'Québec', country: 'CA', stars: 5, lat: 46.8122, lng: -71.2047, units: 2, roomTypes: ['Fairmont Gold Room','Tower Suite'], adr: 620, currency: 'CAD', bookingId: 'BK_10003', amadeusId: 'AMH_QC001' },

  // HILTON
  { id: 'H004', name: 'Waldorf Astoria New York', group: 'Hilton', brand: 'Waldorf Astoria', city: 'New York', country: 'US', stars: 5, lat: 40.7565, lng: -73.9740, units: 4, roomTypes: ['Empire Suite','Towers Suite','Park Avenue Suite'], adr: 2200, currency: 'USD', bookingId: 'BK_20001', amadeusId: 'AMH_NY001' },
  { id: 'H005', name: 'Conrad Dubai', group: 'Hilton', brand: 'Conrad', city: 'Dubai', country: 'AE', stars: 5, lat: 25.2048, lng: 55.2708, units: 3, roomTypes: ['King Deluxe','Conrad Suite','Sky Villa'], adr: 1100, currency: 'AED', bookingId: 'BK_20002', amadeusId: 'AMH_DXB001' },
  { id: 'H006', name: 'LXR Hotels & Resorts Bvlgari London', group: 'Hilton', brand: 'LXR', city: 'London', country: 'GB', stars: 5, lat: 51.5034, lng: -0.1530, units: 2, roomTypes:['Garden Suite','Bvlgari Suite'], adr: 2800, currency: 'GBP', bookingId: 'BK_20003', amadeusId: 'AMH_LDN001' },

  // MARRIOTT
  { id: 'H007', name: 'The Ritz-Carlton Paris', group: 'Marriott', brand: 'Ritz-Carlton', city: 'Paris', country: 'FR', stars: 5, lat: 48.8678, lng: 2.3200, units: 3, roomTypes: ['Signature Suite','Elysian Suite','Imperial Suite'], adr: 3200, currency: 'EUR', bookingId: 'BK_30001', amadeusId: 'AMH_PA002' },
  { id: 'H008', name: 'St. Regis Maldives Vommuli Resort', group: 'Marriott', brand: 'St. Regis', city: 'Maldives', country: 'MV', stars: 5, lat: 3.1645, lng: 72.9836, units: 2, roomTypes: ['Ocean Villa','Two-Bedroom Reef Villa'], adr: 5500, currency: 'USD', bookingId: 'BK_30002', amadeusId: 'AMH_MV001' },
  { id: 'H009', name: 'W Tokyo', group: 'Marriott', brand: 'W Hotels', city: 'Tokyo', country: 'JP', stars: 5, lat: 35.6762, lng: 139.7632, units: 2, roomTypes:['Spectacular Room','Fabulous Suite'], adr: 780, currency: 'JPY', bookingId: 'BK_30003', amadeusId: 'AMH_TYO001' },

  // HYATT
  { id: 'H010', name: 'Park Hyatt Paris-Vendôme', group: 'Hyatt', brand: 'Park Hyatt', city: 'Paris', country: 'FR', stars: 5, lat: 48.8697, lng: 2.3297, units: 2, roomTypes: ['Park Suite','Vendôme Suite'], adr: 1800, currency: 'EUR', bookingId: 'BK_40001', amadeusId: 'AMH_PA003' },
  { id: 'H011', name: 'Alila Jabal Akhdar', group: 'Hyatt', brand: 'Alila', city: 'Nizwa', country: 'OM', stars: 5, lat: 23.0523, lng: 57.3422, units: 2, roomTypes: ['Cliff Villa','Sky Villa'], adr: 920, currency: 'OMR', bookingId: 'BK_40002', amadeusId: 'AMH_OM001' },

  // FOUR SEASONS
  { id: 'H012', name: 'Four Seasons George V Paris', group: 'Four Seasons', brand: 'Four Seasons', city: 'Paris', country: 'FR', stars: 5, lat: 48.8736, lng: 2.3009, units: 3, roomTypes: ['Deluxe Suite','La Suite Impériale','Penthouse'], adr: 4200, currency: 'EUR', bookingId: 'BK_50001', amadeusId: 'AMH_PA004' },
  { id: 'H013', name: 'Four Seasons Resort Bali at Sayan', group: 'Four Seasons', brand: 'Four Seasons', city: 'Bali', country: 'ID', stars: 5, lat: -8.5069, lng: 115.2625, units: 2, roomTypes: ['Pool Villa','Royal Villa'], adr: 1900, currency: 'USD', bookingId: 'BK_50002', amadeusId: 'AMH_BAL001' },

  // MANDARIN ORIENTAL
  { id: 'H014', name: 'Mandarin Oriental Hyde Park London', group: 'Mandarin', brand: 'Mandarin Oriental', city: 'London', country: 'GB', stars: 5, lat: 51.5024, lng: -0.1591, units: 2, roomTypes: ['Park View Suite','Hyde Park Suite'], adr: 3100, currency: 'GBP', bookingId: 'BK_60001', amadeusId: 'AMH_LDN002' },
  { id: 'H015', name: 'Mandarin Oriental Bangkok', group: 'Mandarin', brand: 'Mandarin Oriental', city: 'Bangkok', country: 'TH', stars: 5, lat: 13.7249, lng: 100.5147, units: 2, roomTypes: ['Author Suite','Garden Wing Suite'], adr: 560, currency: 'THB', bookingId: 'BK_60002', amadeusId: 'AMH_BKK001' },

  // AMAN
  { id: 'H016', name: 'Amangiri', group: 'Aman', brand: 'Aman', city: 'Canyon Point', country: 'US', stars: 5, lat: 37.0042, lng: -111.4498, units: 2, roomTypes: ['Canyon Suite','Mesa Pavilion'], adr: 4800, currency: 'USD', bookingId: 'BK_70001', amadeusId: 'AMH_US001' },
  { id: 'H017', name: 'Aman Venice', group: 'Aman', brand: 'Aman', city: 'Venice', country: 'IT', stars: 5, lat: 45.4363, lng: 12.3257, units: 2, roomTypes: ['Grand Salon Suite','Palazzo Suite'], adr: 6200, currency: 'EUR', bookingId: 'BK_70002', amadeusId: 'AMH_VCE001' },

  // IHG
  { id: 'H018', name: 'InterContinental Paris Le Grand', group: 'IHG', brand: 'InterContinental', city: 'Paris', country: 'FR', stars: 5, lat: 48.8754, lng: 2.3307, units: 3, roomTypes: ['Club Room','Opera Suite','Grand Suite'], adr: 750, currency: 'EUR', bookingId: 'BK_80001', amadeusId: 'AMH_PA005' },
  { id: 'H019', name: 'Kimpton De Witt Amsterdam', group: 'IHG', brand: 'Kimpton', city: 'Amsterdam', country: 'NL', stars: 5, lat: 52.3762, lng: 4.8975, units: 2, roomTypes: ['Deluxe Suite','Penthouse Suite'], adr: 480, currency: 'EUR', bookingId: 'BK_80002', amadeusId: 'AMH_AMS001' },
];

/* ─────────────────────────────────────────────
   MOCK DATA — Vouchers
───────────────────────────────────────────── */
const VOUCHERS_DB = {
  'V-2026-ACC-001': { hotelId: 'H001', nights: 5, type: 'Superior', expiresAt: '2026-12-31', usedNights: 1, guestName: null },
  'V-2026-ACC-002': { hotelId: 'H002', nights: 3, type: 'Standard', expiresAt: '2026-09-30', usedNights: 0, guestName: null },
  'V-2026-HLT-001': { hotelId: 'H004', nights: 7, type: 'Premium', expiresAt: '2027-03-31', usedNights: 2, guestName: 'M. James Harrington' },
  'V-2026-MRR-001': { hotelId: 'H007', nights: 4, type: 'Superior', expiresAt: '2026-11-30', usedNights: 0, guestName: null },
  'V-2026-AMN-001': { hotelId: 'H016', nights: 6, type: 'Premium', expiresAt: '2027-06-30', usedNights: 0, guestName: null },
};

/* ─────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────── */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomLatency() {
  const { min, max } = API_CONFIG.simulateLatency;
  return min + Math.random() * (max - min);
}

function shouldSimulateError() {
  return Math.random() < API_CONFIG.errorRate;
}

function generateBookingRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateRoomAvailability(hotel, checkIn, checkOut, roomType) {
  const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000);
  const totalRooms = hotel.units * 2;
  const available = Math.floor(Math.random() * totalRooms);
  const rate = hotel.adr * (0.9 + Math.random() * 0.3);
  return {
    roomType: roomType || hotel.roomTypes[0],
    totalRooms,
    available,
    rate: parseFloat(rate.toFixed(2)),
    currency: hotel.currency,
    nights,
    total: parseFloat((rate * nights).toFixed(2)),
    mealPlan: ['RO','BB','HB'][Math.floor(Math.random() * 3)],
    cancellationPolicy: available > 2 ? 'FREE_CANCELLATION_24H' : 'NON_REFUNDABLE',
    lastUpdated: new Date().toISOString(),
  };
}

function formatApiResponse(source, data, requestId) {
  return {
    source,
    requestId: requestId || `REQ_${Date.now()}`,
    timestamp: new Date().toISOString(),
    status: 'success',
    data,
  };
}

/* ─────────────────────────────────────────────
   BOOKING.COM DEMAND API CLIENT (simulated)
───────────────────────────────────────────── */
class BookingComAPI {
  constructor(config) {
    this.config = config;
    this.authenticated = false;
    this.tokenExpiry = null;
  }

  async authenticate() {
    await sleep(randomLatency());
    this.authenticated = true;
    this.tokenExpiry = Date.now() + 3600000; // 1h
    console.log('[Booking.com] Authenticated — token valid 1h');
    return { access_token: `bk_${Date.now()}`, expires_in: 3600, token_type: 'Bearer' };
  }

  async getHotelList(params = {}) {
    if (!this.authenticated) await this.authenticate();
    await sleep(randomLatency());
    if (shouldSimulateError()) throw new Error('Booking.com API: Rate limit exceeded (429)');

    const hotels = HOTEL_INVENTORY.filter(h => {
      if (params.group && h.group !== params.group) return false;
      if (params.country && h.country !== params.country) return false;
      return true;
    });

    return formatApiResponse('booking.com', {
      hotels: hotels.map(h => ({
        hotel_id: h.bookingId,
        internal_id: h.id,
        name: h.name,
        city: h.city,
        country_code: h.country,
        star_rating: h.stars,
        chain: h.group,
        brand: h.brand,
        geo: { latitude: h.lat, longitude: h.lng },
        room_count: h.units * 2,
        currency: h.currency,
      })),
      total: hotels.length,
    });
  }

  async checkAvailability(params) {
    const { hotelId, checkIn, checkOut, roomType, adults = 2 } = params;
    if (!this.authenticated) await this.authenticate();
    await sleep(randomLatency());
    if (shouldSimulateError()) throw new Error('Booking.com API: Service temporarily unavailable (503)');

    const hotel = HOTEL_INVENTORY.find(h => h.bookingId === hotelId || h.id === hotelId);
    if (!hotel) throw new Error(`Hotel not found: ${hotelId}`);

    const rooms = hotel.roomTypes.map(rt => generateRoomAvailability(hotel, checkIn, checkOut, rt));

    return formatApiResponse('booking.com', {
      hotel_id: hotel.bookingId,
      hotel_name: hotel.name,
      check_in: checkIn,
      check_out: checkOut,
      adults,
      rooms_available: rooms.filter(r => r.available > 0).length,
      room_types: rooms,
      channel_status: 'LIVE',
      sync_timestamp: new Date().toISOString(),
    });
  }

  async blockRoom(params) {
    const { hotelId, checkIn, checkOut, roomType, guestName, voucherId } = params;
    if (!this.authenticated) await this.authenticate();
    await sleep(randomLatency() * 1.5);

    const hotel = HOTEL_INVENTORY.find(h => h.bookingId === hotelId || h.id === hotelId);
    if (!hotel) throw new Error(`Hotel not found: ${hotelId}`);

    const bookingRef = generateBookingRef();
    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000);

    return formatApiResponse('booking.com', {
      booking_reference: bookingRef,
      status: 'CONFIRMED',
      hotel_id: hotel.bookingId,
      hotel_name: hotel.name,
      guest_name: guestName,
      room_type: roomType || hotel.roomTypes[0],
      check_in: checkIn,
      check_out: checkOut,
      nights,
      voucher_id: voucherId || null,
      confirmation_email_sent: true,
      hotel_confirmation_number: `HC${Math.floor(Math.random() * 900000 + 100000)}`,
      channel: 'THE_ESTATE_DIRECT',
    });
  }

  async cancelBooking(bookingRef) {
    if (!this.authenticated) await this.authenticate();
    await sleep(randomLatency());

    return formatApiResponse('booking.com', {
      booking_reference: bookingRef,
      status: 'CANCELLED',
      cancellation_fee: 0,
      refund_amount: null,
      cancelled_at: new Date().toISOString(),
    });
  }

  async getHotelRates(hotelId, dateRange) {
    if (!this.authenticated) await this.authenticate();
    await sleep(randomLatency());

    const hotel = HOTEL_INVENTORY.find(h => h.bookingId === hotelId || h.id === hotelId);
    if (!hotel) throw new Error(`Hotel not found: ${hotelId}`);

    const rates = [];
    const start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      rates.push({
        date: d.toISOString().split('T')[0],
        rate: parseFloat((hotel.adr * (isWeekend ? 1.25 : 1.0) * (0.85 + Math.random() * 0.35)).toFixed(2)),
        currency: hotel.currency,
        availability: Math.floor(Math.random() * hotel.units * 2),
      });
    }

    return formatApiResponse('booking.com', { hotel_id: hotelId, rates });
  }
}

/* ─────────────────────────────────────────────
   AMADEUS HOTEL API CLIENT (simulated)
───────────────────────────────────────────── */
class AmadeusAPI {
  constructor(config) {
    this.config = config;
    this.accessToken = null;
  }

  async getAccessToken() {
    await sleep(randomLatency() * 0.5);
    this.accessToken = `amad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[Amadeus] OAuth2 token obtained');
    return this.accessToken;
  }

  async searchHotels(params) {
    if (!this.accessToken) await this.getAccessToken();
    await sleep(randomLatency());
    if (shouldSimulateError()) throw new Error('Amadeus API: Invalid access token (401)');

    const { cityCode, checkInDate, checkOutDate, adults = 2, roomQuantity = 1, ratings } = params;
    const hotels = HOTEL_INVENTORY.filter(h => {
      if (cityCode && h.country !== cityCode && h.city.toLowerCase() !== cityCode.toLowerCase()) return false;
      if (ratings && !ratings.includes(h.stars)) return false;
      return true;
    });

    return {
      meta: { count: hotels.length, links: { self: `${this.config.baseUrl}/shopping/hotel-offers` } },
      data: hotels.map(h => {
        const avail = generateRoomAvailability(h, checkInDate, checkOutDate);
        return {
          type: 'hotel-offers',
          hotel: {
            type: 'hotel',
            hotelId: h.amadeusId,
            chainCode: h.group.substring(0, 3).toUpperCase(),
            name: h.name,
            rating: String(h.stars),
            cityCode: h.country,
            latitude: h.lat,
            longitude: h.lng,
          },
          available: avail.available > 0,
          offers: [{
            id: `OFF_${generateBookingRef()}`,
            checkInDate,
            checkOutDate,
            roomQuantity,
            price: {
              currency: h.currency,
              base: String(avail.rate),
              total: String(avail.total),
              taxes: [{ amount: String((avail.rate * 0.1).toFixed(2)), currency: h.currency, included: false }],
            },
            room: {
              type: avail.roomType,
              typeEstimated: { category: 'SUITE', beds: 1, bedType: 'KING' },
              description: { text: `Exclusive ${avail.roomType} with premium amenities.`, lang: 'EN' },
            },
            guests: { adults },
            policies: {
              cancellations: [{ type: avail.cancellationPolicy, deadline: checkInDate }],
              paymentType: 'GUARANTEE',
            },
          }],
        };
      }),
    };
  }

  async getHotelOffers(hotelId, params) {
    if (!this.accessToken) await this.getAccessToken();
    await sleep(randomLatency());

    const hotel = HOTEL_INVENTORY.find(h => h.amadeusId === hotelId || h.id === hotelId);
    if (!hotel) throw new Error(`Amadeus: hotel not found ${hotelId}`);

    const { checkInDate, checkOutDate } = params;
    const offers = hotel.roomTypes.map(rt => {
      const avail = generateRoomAvailability(hotel, checkInDate, checkOutDate, rt);
      return {
        id: `OFF_${generateBookingRef()}`,
        roomType: rt,
        available: avail.available > 0,
        availableRooms: avail.available,
        price: { currency: hotel.currency, total: avail.total, perNight: avail.rate },
        mealPlan: avail.mealPlan,
        cancellationPolicy: avail.cancellationPolicy,
      };
    });

    return {
      hotelId: hotel.amadeusId,
      hotelName: hotel.name,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      offers,
      lastUpdated: new Date().toISOString(),
    };
  }

  async bookOffer(offerId, params) {
    if (!this.accessToken) await this.getAccessToken();
    await sleep(randomLatency() * 1.5);

    const ref = generateBookingRef();
    return {
      data: {
        type: 'hotel-order',
        id: `ORD_${ref}`,
        status: 'CONFIRMED',
        reference: ref,
        offerId,
        guests: params.guests,
        payment: { method: 'VOUCHER', voucherId: params.voucherId },
        associatedRecords: [{ reference: `GDS_${ref}`, originSystemCode: 'GDS' }],
        createdAt: new Date().toISOString(),
      },
    };
  }
}

/* ─────────────────────────────────────────────
   UNIFIED HOTEL API CLIENT
───────────────────────────────────────────── */
class HotelAPIClient {
  constructor() {
    this.booking = new BookingComAPI(API_CONFIG.booking);
    this.amadeus = new AmadeusAPI(API_CONFIG.amadeus);
    this.cache = new Map();
    this.preferredSource = 'booking'; // 'booking' | 'amadeus' | 'best'
    this._listeners = {};
  }

  /* Event emitter */
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }
  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  /* Initialize both clients */
  async init() {
    this._emit('status', { type: 'connecting', message: 'Connexion aux APIs...' });
    const [bk, am] = await Promise.allSettled([
      this.booking.authenticate(),
      this.amadeus.getAccessToken(),
    ]);
    const status = {
      booking: bk.status === 'fulfilled' ? 'connected' : 'error',
      amadeus: am.status === 'fulfilled' ? 'connected' : 'error',
    };
    this._emit('status', { type: 'ready', message: 'APIs connectées', channels: status });
    return status;
  }

  /* Get full hotel portfolio */
  async getPortfolio(filters = {}) {
    const cacheKey = `portfolio_${JSON.stringify(filters)}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.ts < 300000) return cached.data; // 5min cache
    }

    this._emit('loading', { operation: 'getPortfolio' });
    let hotels = HOTEL_INVENTORY;
    if (filters.group) hotels = hotels.filter(h => h.group === filters.group);
    if (filters.country) hotels = hotels.filter(h => h.country === filters.country);
    if (filters.city) hotels = hotels.filter(h => h.city.toLowerCase().includes(filters.city.toLowerCase()));

    const data = { hotels, total: hotels.length, source: 'local_cache', groups: this._groupSummary(hotels) };
    this.cache.set(cacheKey, { ts: Date.now(), data });
    this._emit('loaded', { operation: 'getPortfolio', count: hotels.length });
    return data;
  }

  /* Check availability from both sources */
  async checkAvailability(hotelId, checkIn, checkOut, options = {}) {
    this._emit('loading', { operation: 'checkAvailability', hotelId });
    const hotel = HOTEL_INVENTORY.find(h => h.id === hotelId);
    if (!hotel) throw new Error(`Hotel inconnu: ${hotelId}`);

    let bookingResult = null, amadeusResult = null, errors = [];

    const [bkRes, amRes] = await Promise.allSettled([
      this.booking.checkAvailability({ hotelId: hotel.bookingId, checkIn, checkOut, ...options }),
      this.amadeus.getHotelOffers(hotel.amadeusId, { checkInDate: checkIn, checkOutDate: checkOut }),
    ]);

    if (bkRes.status === 'fulfilled') bookingResult = bkRes.value;
    else errors.push({ source: 'booking.com', error: bkRes.reason.message });

    if (amRes.status === 'fulfilled') amadeusResult = amRes.value;
    else errors.push({ source: 'amadeus', error: amRes.reason.message });

    // Merge & normalize
    const result = this._mergeAvailability(hotel, bookingResult, amadeusResult);
    this._emit('loaded', { operation: 'checkAvailability', hotelId, available: result.totalAvailable });
    return { ...result, errors, sources: { booking: !!bookingResult, amadeus: !!amadeusResult } };
  }

  /* Book a room */
  async bookRoom(params) {
    const { hotelId, checkIn, checkOut, roomType, guestName, voucherId, source = 'booking' } = params;
    this._emit('loading', { operation: 'bookRoom', hotelId });

    const hotel = HOTEL_INVENTORY.find(h => h.id === hotelId);
    if (!hotel) throw new Error(`Hotel inconnu: ${hotelId}`);

    let result;
    if (source === 'amadeus') {
      const offerId = `OFF_${generateBookingRef()}`;
      result = await this.amadeus.bookOffer(offerId, {
        guests: [{ name: guestName }],
        voucherId,
      });
      result = {
        bookingRef: result.data.reference,
        orderId: result.data.id,
        status: 'CONFIRMED',
        source: 'amadeus',
        hotel: { id: hotelId, name: hotel.name },
        checkIn, checkOut, roomType, guestName, voucherId,
        createdAt: new Date().toISOString(),
      };
    } else {
      const res = await this.booking.blockRoom({ hotelId: hotel.bookingId, checkIn, checkOut, roomType, guestName, voucherId });
      result = {
        bookingRef: res.data.booking_reference,
        hotelConfirmation: res.data.hotel_confirmation_number,
        status: res.data.status,
        source: 'booking.com',
        hotel: { id: hotelId, name: hotel.name },
        checkIn, checkOut, roomType, guestName, voucherId,
        channel: res.data.channel,
        createdAt: new Date().toISOString(),
      };
    }

    this._emit('booked', result);
    return result;
  }

  /* Get voucher info */
  getVoucher(voucherId) {
    const v = VOUCHERS_DB[voucherId];
    if (!v) return null;
    const hotel = HOTEL_INVENTORY.find(h => h.id === v.hotelId);
    return {
      id: voucherId,
      ...v,
      hotel,
      remainingNights: v.nights - v.usedNights,
      isExpired: new Date(v.expiresAt) < new Date(),
      isFullyUsed: v.usedNights >= v.nights,
    };
  }

  /* Get rate calendar */
  async getRateCalendar(hotelId, year, month) {
    const hotel = HOTEL_INVENTORY.find(h => h.id === hotelId);
    if (!hotel) throw new Error(`Hotel inconnu: ${hotelId}`);

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const from = firstDay.toISOString().split('T')[0];
    const to = lastDay.toISOString().split('T')[0];

    return this.booking.getHotelRates(hotel.bookingId, { from, to });
  }

  /* Channel Manager — sync status */
  async getChannelStatus() {
    await sleep(randomLatency() * 0.3);
    const channels = [
      { name: 'Booking.com', code: 'BKG', status: Math.random() > 0.05 ? 'LIVE' : 'DEGRADED', latency: Math.floor(randomLatency()), lastSync: new Date(Date.now() - Math.random() * 120000).toISOString(), hotelsConnected: 19 },
      { name: 'Amadeus GDS', code: 'AMD', status: Math.random() > 0.05 ? 'LIVE' : 'DEGRADED', latency: Math.floor(randomLatency() * 1.2), lastSync: new Date(Date.now() - Math.random() * 180000).toISOString(), hotelsConnected: 19 },
      { name: 'Sabre', code: 'SAB', status: Math.random() > 0.1 ? 'LIVE' : 'DEGRADED', latency: Math.floor(randomLatency() * 0.9), lastSync: new Date(Date.now() - Math.random() * 240000).toISOString(), hotelsConnected: 14 },
      { name: 'Travelport', code: 'TVP', status: Math.random() > 0.1 ? 'LIVE' : 'DEGRADED', latency: Math.floor(randomLatency() * 1.1), lastSync: new Date(Date.now() - Math.random() * 200000).toISOString(), hotelsConnected: 12 },
      { name: 'Expedia Partner', code: 'EXP', status: Math.random() > 0.15 ? 'LIVE' : 'OFFLINE', latency: Math.floor(randomLatency() * 1.4), lastSync: new Date(Date.now() - Math.random() * 300000).toISOString(), hotelsConnected: 11 },
      { name: 'Hotel Direct CRS', code: 'CRS', status: 'LIVE', latency: Math.floor(randomLatency() * 0.6), lastSync: new Date(Date.now() - Math.random() * 60000).toISOString(), hotelsConnected: 19 },
    ];
    return { channels, overallHealth: channels.filter(c => c.status === 'LIVE').length / channels.length, timestamp: new Date().toISOString() };
  }

  /* Private helpers */
  _mergeAvailability(hotel, bookingResult, amadeusResult) {
    const roomTypes = hotel.roomTypes.map(rt => {
      const bkRoom = bookingResult?.data?.room_types?.find(r => r.roomType === rt);
      const amRoom = amadeusResult?.offers?.find(o => o.roomType === rt);
      const available = bkRoom?.available ?? amRoom?.availableRooms ?? Math.floor(Math.random() * 4);
      const rate = bkRoom?.rate ?? amRoom?.price?.perNight ?? hotel.adr;
      return { roomType: rt, available, rate: parseFloat(rate), currency: hotel.currency, source: bkRoom ? 'booking.com' : amRoom ? 'amadeus' : 'estimated' };
    });
    return { hotel, roomTypes, totalAvailable: roomTypes.reduce((s, r) => s + r.available, 0) };
  }

  _groupSummary(hotels) {
    const groups = {};
    hotels.forEach(h => {
      if (!groups[h.group]) groups[h.group] = { name: h.group, count: 0, countries: new Set() };
      groups[h.group].count++;
      groups[h.group].countries.add(h.country);
    });
    return Object.values(groups).map(g => ({ ...g, countries: g.countries.size }));
  }
}

/* ─────────────────────────────────────────────
   SINGLETON EXPORT
───────────────────────────────────────────── */
const TheEstateAPI = new HotelAPIClient();

// Auto-expose hotel inventory for other modules
TheEstateAPI.HOTELS = HOTEL_INVENTORY;
TheEstateAPI.VOUCHERS = VOUCHERS_DB;

// Browser global
if (typeof window !== 'undefined') {
  window.TheEstateAPI = TheEstateAPI;
  window.HOTEL_INVENTORY = HOTEL_INVENTORY;
}

// Node.js export
if (typeof module !== 'undefined') {
  module.exports = { TheEstateAPI, HotelAPIClient, BookingComAPI, AmadeusAPI, HOTEL_INVENTORY };
}
