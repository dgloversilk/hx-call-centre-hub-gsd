"use client";

// Renders a Yes / No flag value with colour coding
export default function Tag({ yes }) {
  return yes ? (
    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">Yes</span>
  ) : (
    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500">No</span>
  );
}
