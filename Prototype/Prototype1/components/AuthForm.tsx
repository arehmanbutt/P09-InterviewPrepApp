"use client"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
const formSchema = z.object({
    username: z.string().min(2).max(50),
})

type FormType = "signIn" | "signUp";

const authFormSchema = (type: FormType) => {
    return z.object({
        name: type === "signUp" ? z.string().min(3) : z.string().optional(),
        email: z.email(),
        password: z.string().min(6).max(15),
    })
}

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"


import React from 'react'
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"

const AuthForm = ({ type }: { type: FormType }) => {
    const formSchema = authFormSchema(type)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (type === "signIn") {
                // Handle sign-in logic
                console.log("Signing in with values:", values)
            } else {
                // Handle sign-up logic
                console.log("Signing up with values:", values)
            }
            toast.success(`Successfully ${type === "signIn" ? "signed in" : "signed up"}!`)
        }
        catch (error) {
            console.error("Error submitting form:", error)
            toast.error("Something went wrong, please try again later.")
        }
    }





    const isSignIn = type === "signIn"
    return (
        <div className="card-border lg:min-w-[566px]">
            <div className="flex flex-col gap-6 card py-14 px-10">
                <div className="flex flex-row gap-2 justify-center">
                    <Image src="/logo.svg" alt="Logo" width={38} height={32} />
                    <h2 className="text-primary-100">Interview Prep</h2>
                </div>
                <h3>Practice Job interview with the AI</h3>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4 form w-full">
                        {!isSignIn && <p>Name</p>}
                        <p>Email</p>
                        <p>Password</p>
                        <Button className="btn" type="submit">{isSignIn ? "Sign In" : "Create an Account"}</Button>
                    </form>
                </Form>

                <p className="text-center">{isSignIn ? "Don't have an account?" : "Already have an account?"}
                    <Link className="font-bold text-user-primary ml-1" href={isSignIn ? "/sign-up" : "/sign-in"}>{isSignIn ? "Sign Up" : "Sign In"}</Link>
                </p>
            </div>
        </div>
    )
}

export default AuthForm