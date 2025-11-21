import React, { useEffect } from "react";
import { useRouter } from "next/router";
import LoginPage from "../src/components/auth/LoginPage";
import { User } from "../src/types";

interface IndexPageProps {
  user: User | null;
  setUser: (user: User | null) => void;
}

const IndexPage: React.FC<IndexPageProps> = ({ user, setUser }) => {
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/devices');
    }
  }, [user, router]);

  if (user) {
    return null; // Will redirect
  }

  return <LoginPage onLogin={setUser} />;
};

export default IndexPage;


