import { z } from "zod";

export const priceQuoteItemSchema = z.object({
  label: z.string().min(1, "Label is required"),
  amount: z.number().min(0, "Amount must be positive"),
  sortOrder: z.number().int().default(0),
});

export const tripFinancialsSchema = z.object({
  tcsPercentage: z.number().min(0).max(100).default(5),
  tcsAmount: z.number().min(0).default(0),
  totalWithTcs: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  cityOrStay: z.string().min(1, "City or Stay is required"),
  title: z.string().min(1, "Day title is required"),
  durationHours: z.number().nullable().optional(),
  description: z.string().min(1, "Description is required"),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  customerLovedTips: z.array(z.string()).default([]),
  customerWatchOutTips: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
});

export const accommodationSchema = z.object({
  location: z.string().min(1, "Location is required"),
  checkInDate: z.string().or(z.date()),
  checkOutDate: z.string().or(z.date()),
  hotelName: z.string().min(1, "Hotel name is required"),
  starRating: z.number().int().min(1).max(5).default(4),
  roomType: z.string().min(1, "Room type is required"),
  mealPlan: z.string().min(1, "Meal plan is required"),
  ratingScore: z.number().min(0).max(10).optional().nullable(),
  ratingLabel: z.string().optional().nullable(),
  facilities: z.array(z.string()).default([]),
  nearbyAttractions: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    distanceKm: z.number().min(0, "Distance must be positive"),
  })).default([]),
  nearbyRestaurants: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    distance: z.string().min(1, "Distance is required"),
  })).default([]),
  photos: z.array(z.string()).default([]),
});

export const flightDetailSchema = z.object({
  sector: z.string().min(1, "Sector is required (e.g. AMD to DPS)"),
  airline: z.string().min(1, "Airline is required"),
  departureDateTime: z.string().or(z.date()),
  arrivalDateTime: z.string().or(z.date()),
  durationText: z.string().min(1, "Duration text is required (e.g. 5h 45m)"),
  stops: z.number().int().min(0).default(0),
  layoverInfo: z.string().optional().nullable(),
  carryOnBaggageKg: z.number().int().min(0).optional().nullable(),
  checkInBaggageKg: z.number().int().min(0).optional().nullable(),
  cancellationPolicy: z.string().optional().nullable(),
  flightNotes: z.string().optional().nullable(),
});

export const addOnSchema = z.object({
  name: z.string().min(1, "Name is required"),
  detailsJson: z.object({
    visaType: z.string().optional(),
    length: z.string().optional(),
    validity: z.string().optional(),
    details: z.string().optional(),
  }).default({}),
  price: z.number().min(0, "Price must be positive"),
  priceType: z.string().min(1, "Price type is required (e.g. per person)"),
});

export const restaurantSuggestionSchema = z.object({
  location: z.string().min(1, "Location is required"),
  cuisineType: z.string().min(1, "Cuisine type is required"),
  name: z.string().min(1, "Name is required"),
  rating: z.number().min(0).max(5).optional().nullable(),
  reviewCount: z.number().int().min(0).optional().nullable(),
  isVeg: z.boolean().default(false),
  category: z.string().min(1, "Category is required (e.g. Restaurant, Beach Club)"),
});

export const tripTermsSchema = z.object({
  paymentPolicy: z.string().min(1, "Payment policy is required"),
  cancellationPolicy: z.string().min(1, "Cancellation policy is required"),
  visaRules: z.string().min(1, "Visa rules are required"),
  generalNotes: z.string().min(1, "General notes are required"),
});

export const tripSchema = z.object({
  title: z.string().min(1, "Trip title is required"),
  destination: z.string().min(1, "Destination is required"),
  departureCity: z.string().min(1, "Departure City is required"),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  durationDays: z.number().int().min(1),
  durationNights: z.number().int().min(0),
  numTravellers: z.number().int().min(1),
  consultantName: z.string().min(1, "Consultant name is required"),
  consultantPhone: z.string().min(1, "Consultant phone is required"),
  coverImage: z.string().optional().nullable(),
  priceQuoteItems: z.array(priceQuoteItemSchema).default([]),
  tripFinancials: tripFinancialsSchema,
  itineraryDays: z.array(itineraryDaySchema).default([]),
  accommodations: z.array(accommodationSchema).default([]),
  flightDetails: z.array(flightDetailSchema).default([]),
  addOns: z.array(addOnSchema).default([]),
  restaurantSuggestions: z.array(restaurantSuggestionSchema).default([]),
  tripTerms: tripTermsSchema,
});

export type TripSchemaType = z.infer<typeof tripSchema>;
