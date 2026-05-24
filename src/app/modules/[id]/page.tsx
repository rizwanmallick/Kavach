import { notFound } from "next/navigation";

/**
 * Handles unknown module URLs (e.g. /modules/2000).
 * Valid games use static routes: /modules/1, /modules/2, /modules/3.
 */
export default function UnknownModulePage() {
  notFound();
}
