import React, { useEffect } from "react";
import { useRouter } from "next/router";
import RegisterPage from "../src/components/auth/RegisterPage";
import { User } from "../src/types";

interface RegisterPageProps {
  user: User | null;
  setUser: (user: User | null) => void;
}

const Register: React.FC<RegisterPageProps> = ({ user, setUser }) => {
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/devices');
    }
  }, [user, router]);

  if (user) {
    return null; // Will redirect
  }

  return <RegisterPage onRegister={setUser} />;
};

export default Register;


