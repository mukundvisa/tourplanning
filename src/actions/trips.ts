"use server";

import { db } from "@/lib/db";
import { tripSchema, TripSchemaType } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

function safeDate(val: any) {
  if (!val) return new Date();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Create a new Trip with all nested relational items in a single transaction.
 */
export async function createTrip(payload: TripSchemaType) {
  try {
    // Validate request body
    const data = tripSchema.parse(payload);

    const trip = await db.trip.create({
      data: {
        title: data.title,
        pricingTitle: data.pricingTitle,
        destination: data.destination,
        departureCity: data.departureCity,
        startDate: safeDate(data.startDate),
        endDate: safeDate(data.endDate),
        durationDays: data.durationDays,
        durationNights: data.durationNights,
        numTravellers: data.numTravellers,
        consultantName: data.consultantName,
        consultantPhone: data.consultantPhone,
        coverImage: data.coverImage,
        transportationArrangement: data.transportationArrangement || "Planner",
        startingTransferDetails: data.startingTransferDetails || null,
        packageTransportationDetails: data.packageTransportationDetails || null,
        priceQuoteItems: {
          create: data.priceQuoteItems.map((item) => ({
            label: item.label,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
        },
        tripFinancials: {
          create: {
            tcsPercentage: data.tripFinancials.tcsPercentage,
            tcsAmount: data.tripFinancials.tcsAmount,
            totalWithTcs: data.tripFinancials.totalWithTcs,
            notes: data.tripFinancials.notes,
          },
        },
        itineraryDays: {
          create: data.itineraryDays.map((day) => ({
            dayNumber: day.dayNumber,
            cityOrStay: day.cityOrStay,
            title: day.title,
            durationHours: day.durationHours,
            description: day.description,
            inclusions: day.inclusions,
            exclusions: day.exclusions,
            customerLovedTips: day.customerLovedTips,
            customerWatchOutTips: day.customerWatchOutTips,
            sortOrder: day.sortOrder,
          })),
        },
        accommodations: {
          create: data.accommodations.map((acc) => ({
            location: acc.location,
            checkInDate: safeDate(acc.checkInDate),
            checkOutDate: safeDate(acc.checkOutDate),
            hotelName: acc.hotelName,
            starRating: acc.starRating,
            roomType: acc.roomType,
            mealPlan: acc.mealPlan,
            ratingScore: acc.ratingScore,
            ratingLabel: acc.ratingLabel,
            facilities: acc.facilities,
            nearbyAttractions: acc.nearbyAttractions,
            nearbyRestaurants: acc.nearbyRestaurants,
            photos: acc.photos,
          })),
        },
        flightDetails: {
          create: data.flightDetails.map((flight) => ({
            sector: flight.sector,
            airline: flight.airline,
            departureDateTime: safeDate(flight.departureDateTime),
            arrivalDateTime: safeDate(flight.arrivalDateTime),
            durationText: flight.durationText,
            stops: flight.stops,
            layoverInfo: flight.layoverInfo,
            carryOnBaggageKg: flight.carryOnBaggageKg,
            checkInBaggageKg: flight.checkInBaggageKg,
            cancellationPolicy: flight.cancellationPolicy,
            flightNotes: flight.flightNotes,
            type: flight.type || "Flight",
            travelTime: flight.travelTime || null,
            isStartingTransfer: Boolean(flight.isStartingTransfer),
            isPackageIncluded: Boolean(flight.isPackageIncluded),
          })),
        },
        addOns: {
          create: data.addOns.map((addon) => ({
            name: addon.name,
            detailsJson: addon.detailsJson,
            price: addon.price,
            priceType: addon.priceType,
          })),
        },
        restaurantSuggestions: {
          create: data.restaurantSuggestions.map((rest) => ({
            location: rest.location,
            cuisineType: rest.cuisineType,
            name: rest.name,
            rating: rest.rating,
            reviewCount: rest.reviewCount,
            isVeg: rest.isVeg,
            category: rest.category,
          })),
        },
        tripTerms: {
          create: {
            paymentPolicy: data.tripTerms.paymentPolicy,
            cancellationPolicy: data.tripTerms.cancellationPolicy,
            visaRules: data.tripTerms.visaRules,
            generalNotes: data.tripTerms.generalNotes,
          },
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/trips");
    return { success: true, tripId: trip.id };
  } catch (error: any) {
    console.error("Error in createTrip Action:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

/**
 * Update an existing Trip. Deletes relational children and recreates them to ensure no orphans.
 */
export async function updateTrip(tripId: string, payload: TripSchemaType) {
  try {
    const data = tripSchema.parse(payload);

    // Verify trip exists
    const existingTrip = await db.trip.findUnique({
      where: { id: tripId },
    });
    if (!existingTrip) {
      return { success: false, error: "Trip not found" };
    }

    await db.$transaction(async (tx) => {
      // 1. Delete all nested elements
      await tx.priceQuoteItem.deleteMany({ where: { tripId } });
      await tx.tripFinancials.deleteMany({ where: { tripId } });
      await tx.itineraryDay.deleteMany({ where: { tripId } });
      await tx.accommodation.deleteMany({ where: { tripId } });
      await tx.flightDetail.deleteMany({ where: { tripId } });
      await tx.addOn.deleteMany({ where: { tripId } });
      await tx.restaurantSuggestion.deleteMany({ where: { tripId } });
      await tx.tripTerms.deleteMany({ where: { tripId } });

      // 2. Update parent trip and recreate nested structures
      await tx.trip.update({
        where: { id: tripId },
        data: {
          title: data.title,
          pricingTitle: data.pricingTitle,
          destination: data.destination,
          departureCity: data.departureCity,
          startDate: safeDate(data.startDate),
          endDate: safeDate(data.endDate),
          durationDays: data.durationDays,
          durationNights: data.durationNights,
          numTravellers: data.numTravellers,
          consultantName: data.consultantName,
          consultantPhone: data.consultantPhone,
          coverImage: data.coverImage,
          transportationArrangement: data.transportationArrangement || "Planner",
          startingTransferDetails: data.startingTransferDetails || null,
          packageTransportationDetails: data.packageTransportationDetails || null,
          priceQuoteItems: {
            create: data.priceQuoteItems.map((item) => ({
              label: item.label,
              amount: item.amount,
              sortOrder: item.sortOrder,
            })),
          },
          tripFinancials: {
            create: {
              tcsPercentage: data.tripFinancials.tcsPercentage,
              tcsAmount: data.tripFinancials.tcsAmount,
              totalWithTcs: data.tripFinancials.totalWithTcs,
              notes: data.tripFinancials.notes,
            },
          },
          itineraryDays: {
            create: data.itineraryDays.map((day) => ({
              dayNumber: day.dayNumber,
              cityOrStay: day.cityOrStay,
              title: day.title,
              durationHours: day.durationHours,
              description: day.description,
              inclusions: day.inclusions,
              exclusions: day.exclusions,
              customerLovedTips: day.customerLovedTips,
              customerWatchOutTips: day.customerWatchOutTips,
              sortOrder: day.sortOrder,
            })),
          },
          accommodations: {
            create: data.accommodations.map((acc) => ({
              location: acc.location,
              checkInDate: safeDate(acc.checkInDate),
              checkOutDate: safeDate(acc.checkOutDate),
              hotelName: acc.hotelName,
              starRating: acc.starRating,
              roomType: acc.roomType,
              mealPlan: acc.mealPlan,
              ratingScore: acc.ratingScore,
              ratingLabel: acc.ratingLabel,
              facilities: acc.facilities,
              nearbyAttractions: acc.nearbyAttractions,
              nearbyRestaurants: acc.nearbyRestaurants,
              photos: acc.photos,
            })),
          },
          flightDetails: {
            create: data.flightDetails.map((flight) => ({
              sector: flight.sector,
              airline: flight.airline,
              departureDateTime: safeDate(flight.departureDateTime),
              arrivalDateTime: safeDate(flight.arrivalDateTime),
              durationText: flight.durationText,
              stops: flight.stops,
              layoverInfo: flight.layoverInfo,
              carryOnBaggageKg: flight.carryOnBaggageKg,
              checkInBaggageKg: flight.checkInBaggageKg,
              cancellationPolicy: flight.cancellationPolicy,
              flightNotes: flight.flightNotes,
              type: flight.type || "Flight",
              travelTime: flight.travelTime || null,
              isStartingTransfer: Boolean(flight.isStartingTransfer),
              isPackageIncluded: Boolean(flight.isPackageIncluded),
            })),
          },
          addOns: {
            create: data.addOns.map((addon) => ({
              name: addon.name,
              detailsJson: addon.detailsJson,
              price: addon.price,
              priceType: addon.priceType,
            })),
          },
          restaurantSuggestions: {
            create: data.restaurantSuggestions.map((rest) => ({
              location: rest.location,
              cuisineType: rest.cuisineType,
              name: rest.name,
              rating: rest.rating,
              reviewCount: rest.reviewCount,
              isVeg: rest.isVeg,
              category: rest.category,
            })),
          },
          tripTerms: {
            create: {
              paymentPolicy: data.tripTerms.paymentPolicy,
              cancellationPolicy: data.tripTerms.cancellationPolicy,
              visaRules: data.tripTerms.visaRules,
              generalNotes: data.tripTerms.generalNotes,
            },
          },
        },
      });
    }, {
      maxWait: 15000,
      timeout: 60000,
    });

    revalidatePath("/");
    revalidatePath("/trips");
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateTrip Action:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

/**
 * Delete a trip. Cascade deletion handles related objects automatically.
 */
export async function deleteTrip(tripId: string) {
  try {
    const trip = await db.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return { success: false, error: "Trip not found" };
    }

    await db.trip.delete({
      where: { id: tripId },
    });

    revalidatePath("/");
    revalidatePath("/trips");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteTrip Action:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

/**
 * Fetch a complete trip with all relations for Day-wise Trip Summary & previews.
 */
export async function getTripDetails(tripId: string) {
  try {
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      include: {
        priceQuoteItems: {
          orderBy: { sortOrder: "asc" },
        },
        tripFinancials: true,
        itineraryDays: {
          orderBy: { dayNumber: "asc" },
        },
        accommodations: {
          orderBy: { checkInDate: "asc" },
        },
        flightDetails: {
          orderBy: { departureDateTime: "asc" },
        },
        addOns: true,
        restaurantSuggestions: true,
        tripTerms: true,
        costCalculation: true,
      },
    });

    if (!trip) {
      return { success: false, error: "Trip not found" };
    }

    return { success: true, data: JSON.parse(JSON.stringify(trip)) };
  } catch (error: any) {
    console.error("Error in getTripDetails Action:", error);
    return { success: false, error: error.message || "Failed to load trip details" };
  }
}

