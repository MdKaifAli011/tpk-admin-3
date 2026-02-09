"use client";

import React from "react";
import { StoreProvider } from "./StoreContext";

export default function StoreLayout({ children }) {
  return (
    <StoreProvider>
      <div>
        {children}
      </div>
    </StoreProvider>
  );
}
