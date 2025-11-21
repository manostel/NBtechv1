import React, { useEffect } from "react";
import { useRouter } from "next/router";
import SettingsPage from "../src/components/layout/SettingsPage";
import { User } from "../src/types";

interface SettingsPageProps {
  user: User | null;
}

const Settings: React.FC<SettingsPageProps> = ({ user }) => {
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) {
    return null; // Will redirect
  }

  return <SettingsPage />;
};

export default Settings;


