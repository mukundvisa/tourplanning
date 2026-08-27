const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...");
  await prisma.trip.deleteMany({});

  console.log("Seeding a detailed master travel itinerary...");

  const startDate = new Date("2026-10-10");
  const endDate = new Date("2026-10-15");

  const trip = await prisma.trip.create({
    data: {
      title: "Magical 5 Days Bali Luxury Escape",
      destination: "Bali, Indonesia",
      departureCity: "Mumbai (BOM)",
      startDate,
      endDate,
      durationDays: 5,
      durationNights: 4,
      numTravellers: 2,
      consultantName: "Akshar Patel",
      consultantPhone: "+91 98765 43210",
      
      // Price Quote line-items
      priceQuoteItems: {
        create: [
          { label: "5-Star Beachfront Luxury Villa (4 Nights)", amount: 55000, sortOrder: 0 },
          { label: "VIP Airport Meet & Greet + Private Transits", amount: 8000, sortOrder: 1 },
          { label: "Uluwatu Sunset Tour & Seafood Candlelight Dinner", amount: 6500, sortOrder: 2 },
          { label: "Tanjung Benoa Watersports Entry Tickets", amount: 4500, sortOrder: 3 },
        ]
      },

      // Financial total and tax notes
      tripFinancials: {
        create: {
          tcsPercentage: 5,
          tcsAmount: 3700, // 5% of 74,000
          totalWithTcs: 77700,
          notes: "*Govt TCS is fully refundable and can be adjusted in your ITR return. Flight rates are dynamic and booked separately.",
        }
      },

      // Itinerary Days
      itineraryDays: {
        create: [
          {
            dayNumber: 1,
            cityOrStay: "Seminyak",
            title: "VIP Arrival & Sunset Jimbaran Seafood Dinner",
            durationHours: 4,
            description: "Welcome to Bali! Arrive at Denpasar International Airport (DPS). Experience fast-track VIP arrival services, clear immigration smoothly, and meet our private driver in the arrivals lobby.\n\nEnjoy a comfortable transfer to your luxury beachfront villa in Seminyak. Check in and unpack. In the evening, drive down to the white sands of Jimbaran Beach. Indulge in a private candlelight grilled seafood feast right by the crashing waves.",
            inclusions: ["Airport fast-track VIP pickup", "Private AC coach transfer", "Jimbaran beach candlelight grilled dinner"],
            exclusions: ["Lunch fees"],
            customerLovedTips: ["Request table close to the shoreline for the best twilight photos", "The grilled red snapper is highly recommended"],
            customerWatchOutTips: ["Jimbaran beach gets breezy in the evening, bring a light cardigan"],
            sortOrder: 1
          },
          {
            dayNumber: 2,
            cityOrStay: "Seminyak",
            title: "Benoa Water Sports & Uluwatu Cliff Temple Sunset",
            durationHours: 8,
            description: "Kick off the morning with thrilling water activities at Tanjung Benoa. Enjoy an adrenaline-fueled Banana Boat ride and fly high over the water with parasailing. Return to Seminyak for lunch and quick relaxation.\n\nAt 3:30 PM, drive to the southern cliff-tip of Bali to explore the ancient Uluwatu Temple, perched 70 meters above the Indian Ocean. At 6 PM, watch the traditional Kecak Fire Dance, narrating the Ramayana epic against a spectacular ocean sunset backdrop.",
            inclusions: ["Banana boat ride (1 round)", "Uluwatu temple entry tickets", "Kecak fire dance tickets", "Private chauffeur service"],
            exclusions: ["Water sports extras (jet ski / flyboard)", "Lunch"],
            customerLovedTips: ["The cliff views facing the setting sun are magnificent", "Kecak dance performers interact with the crowd, sit in the middle row!"],
            customerWatchOutTips: ["Keep sunglasses, hats, and shiny items secure as Uluwatu monkeys are notorious pickpockets"],
            sortOrder: 2
          },
          {
            dayNumber: 3,
            cityOrStay: "Ubud",
            title: "Ubud Jungle Swing & Sacred Monkey Forest Sanctuary",
            durationHours: 7,
            description: "Check out of Seminyak. Travel inland toward Ubud, the cultural heart of Bali. Stop at the famous Alas Harum jungle swing and capture breathtaking photos soaring above the lush green rice terraces.\n\nIn the afternoon, stroll through the shady paths of the Sacred Monkey Forest Sanctuary in Ubud. Walk under towering banyan trees and watch hundreds of grey long-tailed macaques play in their natural forest habitat. Check in to your forest-view luxury stay in Ubud.",
            inclusions: ["Jungle Swing tickets", "Alas Harum entrance", "Sacred Monkey Forest entrance", "Transfer to Ubud stay"],
            exclusions: ["Lunch and cafe expenditures"],
            customerLovedTips: ["Wear bright flowing dresses for contrast against the green valley photos on the swing"],
            customerWatchOutTips: ["Avoid making direct eye contact or showing food to the monkeys in the sanctuary"],
            sortOrder: 3
          },
          {
            dayNumber: 4,
            cityOrStay: "Ubud",
            title: "Ubud Royal Palace & Kanto Lampo Waterfall Trek",
            durationHours: 6,
            description: "Explore Ubud center in the morning. Visit the Ubud Royal Palace (Puri Saren Agung) to admire beautiful traditional Balinese stone carvings. Wander through the Ubud Art Market nearby for local handicrafts.\n\nIn the afternoon, escape the crowds and drive to the scenic Kanto Lampo Waterfall. Descend the stairs and step into the shallow river to climb the scenic rock shelves as cool spring water cascades around you.",
            inclusions: ["Ubud Palace entrance", "Kanto Lampo waterfall entry fees", "Local safety guide at waterfall"],
            exclusions: ["Personal shopping expenses"],
            customerLovedTips: ["Hire a local helper at Kanto Lampo for a tip; they know the best photo spots and will take amazing shots!"],
            customerWatchOutTips: ["Steps leading down to the waterfall pool can be slippery. Wear shoes with good grip"],
            sortOrder: 4
          },
          {
            dayNumber: 5,
            cityOrStay: "Departure",
            title: "Souvenir Shopping & Departure Transfer",
            durationHours: 4,
            description: "Savor a leisurely floating breakfast in your private villa pool. Check out of your Ubud resort at 12:00 PM. Meet your driver and stop by local handicraft boutiques or coffee plantations for souvenir shopping.\n\nTransfer to Denpasar International Airport (DPS) in time for your flight back home, carrying unforgettable memories of your 30 Sundays Bali escape.",
            inclusions: ["Floating breakfast in villa", "Private airport departure transfer", "Luggage handling support"],
            exclusions: ["Souvenir costs", "Airport meals"],
            customerLovedTips: ["Try the organic Luwak Coffee at the plantation check-point"],
            customerWatchOutTips: ["Arrive at Denpasar airport at least 3 hours before international departure due to immigration lines"],
            sortOrder: 5
          }
        ]
      },

      // Accommodations
      accommodations: {
        create: [
          {
            location: "Seminyak Stay",
            checkInDate: new Date("2026-10-10"),
            checkOutDate: new Date("2026-10-12"),
            hotelName: "The Seminyak Beach Resort & Spa",
            starRating: 5,
            roomType: "Luxury Ocean View Villa with Private Pool",
            mealPlan: "CP (Breakfast Included)",
            ratingScore: 4.8,
            ratingLabel: "Exceptional",
            facilities: ["Infinity Pool", "Ocean Spa", "Beach Bar", "Free High-speed Wi-Fi"],
            nearbyAttractions: [
              { name: "Seminyak Beach", distanceKm: 0.1 },
              { name: "Petitenget Temple", distanceKm: 0.8 }
            ],
            nearbyRestaurants: [
              { name: "La Lucciola Restaurant", distance: "5m walk" },
              { name: "Ku De Ta Beach Bar", distance: "8m walk" }
            ],
            photos: [
              "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"
            ]
          },
          {
            location: "Ubud Stay",
            checkInDate: new Date("2026-10-12"),
            checkOutDate: new Date("2026-10-15"),
            hotelName: "Maya Ubud Resort & Spa",
            starRating: 5,
            roomType: "Deluxe Forest Valley Pool Villa",
            mealPlan: "CP (Breakfast Included)",
            ratingScore: 4.9,
            ratingLabel: "Superb",
            facilities: ["Valley Infinity Pool", "Riverside Spa", "Yoga Pavilion", "Gym"],
            nearbyAttractions: [
              { name: "Sacred Monkey Forest", distanceKm: 2.5 },
              { name: "Ubud Royal Palace", distanceKm: 2.8 }
            ],
            nearbyRestaurants: [
              { name: "Locavore Fine Dining", distance: "10m drive" },
              { name: "Bebek Bengil Crispy Duck", distance: "8m drive" }
            ],
            photos: [
              "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80"
            ]
          }
        ]
      },

      // Flight details
      flightDetails: {
        create: [
          {
            sector: "BOM to DPS",
            airline: "VietJet Air VJ-896",
            departureDateTime: new Date("2026-10-10T05:30:00"),
            arrivalDateTime: new Date("2026-10-10T14:30:00"),
            durationText: "6h 30m",
            stops: 1,
            layoverInfo: "1h 30m layover in SGN",
            carryOnBaggageKg: 7,
            checkInBaggageKg: 20,
            cancellationPolicy: "Non-refundable ticket. Date change allowed with fee."
          },
          {
            sector: "DPS to BOM",
            airline: "VietJet Air VJ-897",
            departureDateTime: new Date("2026-10-15T16:00:00"),
            arrivalDateTime: new Date("2026-10-15T23:30:00"),
            durationText: "7h 30m",
            stops: 1,
            layoverInfo: "2h layover in SGN",
            carryOnBaggageKg: 7,
            checkInBaggageKg: 20,
            cancellationPolicy: "Non-refundable ticket."
          }
        ]
      },

      // Addons
      addOns: {
        create: [
          {
            name: "Indonesia Electronic Visa on Arrival (E-VoA)",
            detailsJson: {
              visaType: "Tourist B213 Single Entry",
              length: "30 Days maximum stay",
              validity: "90 Days from issue window"
            },
            price: 3500,
            priceType: "per person"
          }
        ]
      },

      // Restaurant Suggestions
      restaurantSuggestions: {
        create: [
          {
            location: "Seminyak",
            cuisineType: "International",
            name: "Potato Head Beach Club",
            rating: 4.7,
            reviewCount: 3500,
            isVeg: true,
            category: "Beach Club"
          },
          {
            location: "Seminyak",
            cuisineType: "Local Balinese",
            name: "Made's Warung Seminyak",
            rating: 4.5,
            reviewCount: 1200,
            isVeg: false,
            category: "Restaurant"
          },
          {
            location: "Ubud",
            cuisineType: "International / Cafe",
            name: "Milk & Madu Ubud",
            rating: 4.6,
            reviewCount: 850,
            isVeg: true,
            category: "Restaurant"
          }
        ]
      },

      // Global terms
      tripTerms: {
        create: {
          paymentPolicy: "25% token payment requested to book international flight segments.\nBalance 75% payment requested 15 days prior to travel departure.",
          cancellationPolicy: "Cancellation requested 30 days prior: Full refund (excluding flight cancellation charges).\nCancellation 15-30 days prior: 50% penalty.\nCancellation within 14 days of travel: 100% non-refundable.",
          visaRules: "Passport must possess a minimum validity of 6 months from travel arrival date.\nIndonesia E-VoA takes 3 business days to process and issue.",
          generalNotes: "Standard hotel check-in hour is 2:00 PM. Check-out hour is 12:00 PM.\nFloating breakfast is subject to weather conditions and villa availability."
        }
      }
    }
  });

  console.log(`Seeded trip with ID: ${trip.id}`);
  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
