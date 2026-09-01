import { z } from "zod";

export const priceQuoteItemSchema = z.object({
  label: z.string().default(""),
  amount: z.number().default(0),
  sortOrder: z.number().int().default(0),
});

export const tripFinancialsSchema = z.object({
  tcsPercentage: z.number().default(5),
  tcsAmount: z.number().default(0),
  totalWithTcs: z.number().default(0),
  notes: z.string().optional().nullable(),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  cityOrStay: z.string().default(""),
  title: z.string().default(""),
  durationHours: z.union([z.string(), z.number()]).nullable().optional().transform((val) => val === null || val === undefined ? null : String(val)),
  description: z.string().default(""),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  customerLovedTips: z.array(z.string()).default([]),
  customerWatchOutTips: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
});

export const accommodationSchema = z.object({
  location: z.string().default(""),
  checkInDate: z.string().or(z.date()).optional().nullable().or(z.literal("")),
  checkOutDate: z.string().or(z.date()).optional().nullable().or(z.literal("")),
  hotelName: z.string().default(""),
  starRating: z.number().int().default(4),
  roomType: z.string().default(""),
  mealPlan: z.string().default(""),
  ratingScore: z.number().optional().nullable(),
  ratingLabel: z.string().optional().nullable(),
  facilities: z.array(z.string()).default([]),
  nearbyAttractions: z.array(z.object({
    name: z.string().default(""),
    distanceKm: z.number().default(0),
  })).default([]),
  nearbyRestaurants: z.array(z.object({
    name: z.string().default(""),
    distance: z.string().default(""),
  })).default([]),
  photos: z.array(z.string()).default([]),
});

export const flightDetailSchema = z.object({
  sector: z.string().default(""),
  airline: z.string().default(""),
  departureDateTime: z.string().or(z.date()).optional().nullable().or(z.literal("")),
  arrivalDateTime: z.string().or(z.date()).optional().nullable().or(z.literal("")),
  durationText: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? val.trim() : "Direct")),
  stops: z.number().int().default(0),
  layoverInfo: z.string().optional().nullable(),
  carryOnBaggageKg: z.number().int().optional().nullable(),
  checkInBaggageKg: z.number().int().optional().nullable(),
  cancellationPolicy: z.string().optional().nullable(),
  flightNotes: z.string().optional().nullable(),
  type: z.string().default("Flight"),
  travelTime: z.string().optional().nullable(),
  isStartingTransfer: z.boolean().default(false),
  isPackageIncluded: z.boolean().default(false),
});

export const addOnSchema = z.object({
  name: z.string().default(""),
  detailsJson: z.object({
    visaType: z.string().optional(),
    length: z.string().optional(),
    validity: z.string().optional(),
    details: z.string().optional(),
  }).default({}),
  price: z.number().default(0),
  priceType: z.string().default("per person"),
});

export const restaurantSuggestionSchema = z.object({
  location: z.string().default(""),
  cuisineType: z.string().default(""),
  name: z.string().default(""),
  rating: z.number().optional().nullable(),
  reviewCount: z.number().int().optional().nullable(),
  isVeg: z.boolean().default(false),
  category: z.string().default("Restaurant"),
});

export const tripTermsSchema = z.object({
  paymentPolicy: z.string().default(""),
  cancellationPolicy: z.string().default(""),
  visaRules: z.string().default(""),
  generalNotes: z.string().default(""),
});

export const tripSchema = z.object({
  title: z.string().default(""),
  pricingTitle: z.string().optional().nullable(),
  destination: z.string().default(""),
  departureCity: z.string().default(""),
  startDate: z.string().or(z.date()).optional().nullable().or(z.literal("")),
  endDate: z.string().or(z.date()).optional().nullable().or(z.literal("")),
  durationDays: z.number().int().default(1),
  durationNights: z.number().int().default(0),
  numTravellers: z.number().int().default(2),
  consultantName: z.string().default(""),
  consultantPhone: z.string().default(""),
  coverImage: z.string().optional().nullable(),
  priceQuoteItems: z.array(priceQuoteItemSchema).default([]),
  tripFinancials: tripFinancialsSchema,
  itineraryDays: z.array(itineraryDaySchema).default([]),
  accommodations: z.array(accommodationSchema).default([]),
  flightDetails: z.array(flightDetailSchema).default([]),
  addOns: z.array(addOnSchema).default([]),
  restaurantSuggestions: z.array(restaurantSuggestionSchema).default([]),
  tripTerms: tripTermsSchema,
  transportationArrangement: z.string().default("Planner"),
  startingTransferDetails: z.string().optional().nullable(),
  packageTransportationDetails: z.string().optional().nullable(),
});

export type TripSchemaType = z.infer<typeof tripSchema>;
