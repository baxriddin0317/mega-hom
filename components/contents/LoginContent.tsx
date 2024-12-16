"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, fireDB } from "../../firebase/FirebaseConfig";
import {
  collection,
  DocumentData,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import Loader from "../Loader";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  name: string;
  uid: string;
  time: {
    seconds: number;
    nanoseconds: number;
  };
  date: string;
  role: string;
  email: string;
}

const LoginContent = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useRouter();
  // User Signup State
  const [userLogin, setUserLogin] = useState({
    email: "",
    password: "",
  });

  const isUser = (data: DocumentData): data is User => {
    return (
      data && typeof data.uid === "string" && typeof data.role === "string"
    );
  };

  /**========================================================================
   *========================================================================**/

  const userLoginFunction = async () => {
    // validation
    if (userLogin.email === "" || userLogin.password === "") {
      return toast.error("All Fields are required");
    }

    setLoading(true);
    try {
      const users = await signInWithEmailAndPassword(
        auth,
        userLogin.email,
        userLogin.password
      );

      try {
        const q = query(
          collection(fireDB, "user"),
          where("uid", "==", users?.user?.uid)
        );
        const data = onSnapshot(q, (QuerySnapshot) => {
          let user: User | null = null;
          QuerySnapshot.forEach((doc) => {
            const docData = doc.data();
            if (isUser(docData)) {
              user = docData;
            }
          });
          // QuerySnapshot.forEach((doc) => user = doc.data());
          if (user) {
            localStorage.setItem("users", JSON.stringify(user));
            setUserLogin({
              email: "",
              password: "",
            });
            toast.success("Login Successfully");

            navigate.push("/admin-dashboard");
            // if(user.role === "user") {
            //     navigate.push('/');
            // }else{
            // }
          } else {
            toast.error("User not found or invalid data");
          }
          setLoading(false);
        });
        return () => data;
      } catch (error: any) {
        setLoading(false);
        toast.error(error.message);
      }
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };
  return (
    <div className="flex justify-center items-center h-screen">
      {loading && <Loader />}
      {/* Login Form  */}
      <div className="login_Form bg-pink-50 px-8 py-6 border border-pink-100 rounded-xl shadow-md">
        {/* Top Heading  */}
        <div className="mb-5">
          <h2 className="text-center text-2xl font-bold text-pink-500 "></h2>
        </div>
        {/* Input One  */}
        <div className="mb-3">
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={userLogin.email}
            onChange={(e) => {
              setUserLogin({
                ...userLogin,
                email: e.target.value,
              });
            }}
            className="bg-pink-50 border border-pink-200 px-2 py-2 w-96 rounded-md outline-none placeholder-pink-200"
          />
        </div>
        {/* Input Two  */}
        <div className="mb-5">
          <input
            type="password"
            placeholder="Password"
            value={userLogin.password}
            onChange={(e) => {
              setUserLogin({
                ...userLogin,
                password: e.target.value,
              });
            }}
            className="bg-pink-50 border border-pink-200 px-2 py-2 w-96 rounded-md outline-none placeholder-pink-200"
          />
        </div>
        {/* Signup Button  */}
        <div className="mb-5">
          <button
            type="button"
            onClick={userLoginFunction}
            className="bg-pink-500 hover:bg-pink-600 w-full text-white text-center py-2 font-bold rounded-md "
          >
            Login
          </button>
        </div>
        <div>
          <h2 className="text-black">
            Don&apos;t Have an account{" "}
            <Link className=" text-pink-500 font-bold" href={"/sign-up"}>
              Signup
            </Link>
          </h2>
        </div>
      </div>
    </div>
  );
};

export default LoginContent;
