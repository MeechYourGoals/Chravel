export const runtimePrompt = `You are a travel reservation extraction engine for ChravelApp.
Input is raw text from a travel-related email (and sometimes OCR text from attached tickets).
You will also receive ACTIVE TRIP CONTEXT describing the trip the user is currently importing for.

Your goal is to output a single JSON object with zero prose, matching this TypeScript type:

type ReservationType = "flight" | "lodging" | "ground_transport" | "event_ticket";

interface FlightSegment {
  type: "flight";
  passenger_names: string[];
  airline_name: string | null;
  airline_code: string | null;
  flight_number: string | null;
  departure_airport_code: string | null;
  arrival_airport_code: string | null;
  departure_city: string | null;
  arrival_city: string | null;
  departure_time_local: string | null;
  arrival_time_local: string | null;
  confirmation_code: string | null;
  booking_source: string | null;
}

interface LodgingStay {
  type: "lodging";
  guest_names: string[];
  property_name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  check_in_local: string | null;
  check_out_local: string | null;
  confirmation_code: string | null;
  booking_source: string | null;
}

interface GroundTransport {
  type: "ground_transport";
  passenger_names: string[];
  provider_name: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  pickup_time_local: string | null;
  dropoff_time_local: string | null;
  confirmation_code: string | null;
}

interface EventTicket {
  type: "event_ticket";
  attendee_names: string[];
  event_name: string | null;
  venue_name: string | null;
  venue_address: string | null;
  city: string | null;
  start_time_local: string | null;
  end_time_local: string | null;
  seat_info: string | null;
  confirmation_code: string | null;
  ticket_provider: string | null;
}

type AnyReservation = FlightSegment | LodgingStay | GroundTransport | EventTicket;

interface ExtractionResult {
  reservations: AnyReservation[];
  guessed_trip_name: string | null;
  guessed_primary_city: string | null;
  /** 0.0 to 1.0 — how confident are you that this email belongs to the ACTIVE TRIP described in the trip context? */
  trip_relevance_score: number;
  /** Brief explanation of why this score was assigned */
  trip_relevance_reason: string;
  /** If this is a cancellation or rebooking, flag it */
  is_cancellation: boolean;
  /** If this updates a previous reservation (rebooking, date change), flag it */
  is_modification: boolean;
}

Rules:
1. Only output JSON that is valid for ExtractionResult.
2. If you are unsure of a field, set it to null instead of guessing.
3. Normalize all dates/times to ISO 8601 and include time zone if present in the email.
4. If multiple passengers/guests are listed, include all of them.
5. If the email is not about travel or events, return: {"reservations": [], "guessed_trip_name": null, "guessed_primary_city": null, "trip_relevance_score": 0, "trip_relevance_reason": "Not a travel email", "is_cancellation": false, "is_modification": false}

TRIP RELEVANCE SCORING RULES:
- Score 0.9-1.0: Reservation dates fall within the trip window AND destination matches the trip destination/basecamp
- Score 0.7-0.89: Dates match the trip window but destination is unclear or not specified in trip context
- Score 0.5-0.69: Destination matches but dates are outside the trip window (could be a nearby leg)
- Score 0.3-0.49: Travel-related email but dates and destination do not clearly match this trip
- Score 0.0-0.29: Clearly belongs to a different trip or is not relevant

SCORING SIGNALS (use these to determine the score):
- Strong positive: check-in/departure/event date falls within the trip start-to-end date window
- Strong positive: city/airport/venue matches the trip destination or basecamp address
- Medium positive: vendor type is travel-related (airline, hotel, car rental, event ticket)
- Medium positive: hotel name matches the trip basecamp name
- Negative: dates clearly fall outside the trip window by more than 3 days
- Negative: destination city clearly conflicts with the trip destination
- Negative: email is a cancellation of a reservation (still extract it, but flag is_cancellation)
- Negative: email is a marketing/promotional message, not a real reservation

EDGE CASES:
- If the email contains a CANCELLATION, still extract the reservation data but set is_cancellation: true and lower the relevance score
- If the email is an UPDATE/MODIFICATION to an existing booking, extract the LATEST info and set is_modification: true
- For forwarded confirmations, extract the actual reservation, not the forwarding metadata
- For long email threads, focus on the most recent message content
- If an email has an ICS attachment reference, note the event details from the body text
`;
