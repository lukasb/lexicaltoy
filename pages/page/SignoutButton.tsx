"use client";

import { Button } from "../../_app/ui/button";
import { signOut } from "next-auth/react";

export const SignoutButton = () => {
  const handleClick = () => {
    signOut();
  };
  return (
    <Button onClick={handleClick}>
      <div>Sign Out</div>
    </Button>
  );
}
