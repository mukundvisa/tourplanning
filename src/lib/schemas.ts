import { z } from "zod";

export const priceQuoteItemSchema = z.object({
  label: z.string().catch("").default(""),
  amount: z.coerce.number().catch(0).default(0),
  sortOrder: z.coerce.number().int().catch(0).default(0),
});

export const tripFinancialsSchema = z.object({
  tcsPercentage: z.coerce.number().catch(5).default(5),
  tcsAmount: z.coerce.number().catch(0).default(0),
  totalWithTcs: z.coerce.number().catch(0).default(0),
  notes: z.string().optional().nullable().catch(null),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.coerce.number().int().catch(1).default(1),
  cityOrStay: z.string().catch("").default(""),
  title: z.string().catch("").default(""),
  durationHours: z.union([z.string(), z.number()]).nullable().optional().transform((val) => val === null || val === undefined ? null : String(val)).catch(null),
  description: z.string().catch("").default(""),
  places: z.array(z.string()).catch([]).default([]),
  hotelId: z.string().optional().nullable().catch(null),
  hotelName: z.string().optional().nullable().catch(null),
  hotelPricePerNight: z.coerce.number().optional().nullable().catch(null),
  hotelPricePerPerson: z.coerce.number().optional().nullable().catch(null),
  inclusions: z.array(z.string()).catch([]).default([]),
  exclusions: z.array(z.string()).catch([]).default([]),
  customerLovedTips: z.array(z.string()).catch([]).default([]),
  customerWatchOutTips: z.array(z.string()).catch([]).default([]),
  sortOrder: z.coerce.number().int().catch(0).default(0),
});

export const accommodationSchema = z.object({
  location: z.string().catch("").default(""),
  checkInDate: z.any().optional().nullable(),
  checkOutDate: z.any().optional().nullable(),
  hotelName: z.string().catch("").default(""),
  starRating: z.coerce.number().int().catch(4).default(4),
  roomType: z.string().catch("").default(""),
  mealPlan: z.string().catch("").default(""),
  ratingScore: z.coerce.number().optional().nullable().catch(null),
  ratingLabel: z.string().optional().nullable().catch(null),
  facilities: z.array(z.string()).catch([]).default([]),
  nearbyAttractions: z.array(z.object({
    name: z.string().catch("").default(""),
    distanceKm: z.coerce.number().catch(0).default(0),
  })).catch([]).default([]),
  nearbyRestaurants: z.array(z.object({
    name: z.string().catch("").default(""),
    distance: z.string().catch("").default(""),
  })).catch([]).default([]),
  photos: z.array(z.string()).catch([]).default([]),
});

export const flightDetailSchema = z.object({
  sector: z.string().catch("").default(""),
  airline: z.string().catch("").default(""),
  departureDateTime: z.any().optional().nullable(),
  arrivalDateTime: z.any().optional().nullable(),
  durationText: z
    .any()
    .optional()
    .nullable()
    .transform((val) => (val && typeof val === "string" && val.trim() ? val.trim() : "Direct")),
  stops: z.coerce.number().int().catch(0).default(0),
  layoverInfo: z.string().optional().nullable().catch(null),
  carryOnBaggageKg: z.coerce.number().int().optional().nullable().catch(null),
  checkInBaggageKg: z.coerce.number().int().optional().nullable().catch(null),
  cancellationPolicy: z.string().optional().nullable().catch(null),
  flightNotes: z.string().optional().nullable().catch(null),
  type: z.string().catch("Flight").default("Flight"),
  travelTime: z.string().optional().nullable().catch(null),
  isStartingTransfer: z.boolean().catch(false).default(false),
  isPackageIncluded: z.boolean().catch(false).default(false),
});

export const addOnSchema = z.object({
  name: z.string().catch("").default(""),
  detailsJson: z.any().catch({}).default({}),
  price: z.coerce.number().catch(0).default(0),
  priceType: z.string().catch("per person").default("per person"),
});

export const restaurantSuggestionSchema = z.object({
  location: z.string().catch("").default(""),
  cuisineType: z.string().catch("").default(""),
  name: z.string().catch("").default(""),
  rating: z.coerce.number().optional().nullable().catch(null),
  reviewCount: z.coerce.number().int().optional().nullable().catch(null),
  isVeg: z.boolean().catch(false).default(false),
  category: z.string().catch("Restaurant").default("Restaurant"),
});

export const tripTermsSchema = z.object({
  paymentPolicy: z.string().catch("").default(""),
  cancellationPolicy: z.string().catch("").default(""),
  visaRules: z.string().catch("").default(""),
  generalNotes: z.string().catch("").default(""),
});

export const tripSchema = z.object({
  title: z.string().catch("").default(""),
  pricingTitle: z.string().optional().nullable().catch(null),
  destination: z.string().catch("").default(""),
  departureCity: z.string().catch("").default(""),
  startDate: z.any().optional().nullable(),
  endDate: z.any().optional().nullable(),
  durationDays: z.coerce.number().int().catch(1).default(1),
  durationNights: z.coerce.number().int().catch(0).default(0),
  numTravellers: z.coerce.number().int().catch(2).default(2),
  consultantName: z.string().catch("").default(""),
  consultantPhone: z.string().catch("").default(""),
  coverImage: z.string().optional().nullable().catch(null),
  priceQuoteItems: z.array(priceQuoteItemSchema).catch([]).default([]),
  tripFinancials: tripFinancialsSchema.default({ tcsPercentage: 5, tcsAmount: 0, totalWithTcs: 0, notes: null }),
  itineraryDays: z.array(itineraryDaySchema).catch([]).default([]),
  accommodations: z.array(accommodationSchema).catch([]).default([]),
  flightDetails: z.array(flightDetailSchema).catch([]).default([]),
  addOns: z.array(addOnSchema).catch([]).default([]),
  restaurantSuggestions: z.array(restaurantSuggestionSchema).catch([]).default([]),
  tripTerms: tripTermsSchema.default({ paymentPolicy: "", cancellationPolicy: "", visaRules: "", generalNotes: "" }),
  transportationArrangement: z.string().catch("Planner").default("Planner"),
  startingTransferDetails: z.string().optional().nullable().catch(null),
  packageTransportationDetails: z.string().optional().nullable().catch(null),
});

export type TripSchemaType = z.infer<typeof tripSchema>;
