import { isAuthApiError } from "@supabase/supabase-js";
import { z } from "zod";
import { AppUrlConfigurationError } from "./app-url";

/** Preserve provider throttling and keep delivery/configuration failures out of
 * the success path. Do not expose email addresses or SMTP diagnostics.
 */
export function authErrorDetails(error: unknown) {
  if (isAuthApiError(error)) {
    if (error.code === "over_email_send_rate_limit") {
      return {
        status: 429,
        body: {
          code: "email_rate_limited",
          error:
            "Our email service has reached its sending limit. Please try again later. Repeated signup attempts will not send another confirmation email.",
        },
      };
    }
    if (error.status === 429) {
      return {
        status: 429,
        body: {
          code: "auth_rate_limited",
          error: "Too many requests. Please wait before trying again.",
        },
      };
    }
    if (error.code === "email_address_not_authorized") {
      return {
        status: 503,
        body: {
          code: "email_delivery_unavailable",
          error:
            "Confirmation email delivery is not available for this address yet. Please contact the site administrator.",
        },
      };
    }
  }
  return {
    status: error instanceof AppUrlConfigurationError ? 503 : 400,
    body: {
      error:
        error instanceof z.ZodError
          ? "Please check the form. Use a valid email and a password of at least eight characters."
          : error instanceof Error
            ? error.message
            : "Unable to complete authentication.",
    },
  };
}
