import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
    title: "BookMi Pricing",
    description:
        "Simple pricing in INR. Start with a free 3-month pilot, then choose Basic at ₹499/month or Standard at ₹999/month.",
};

const plans = [
    {
        name: "Free Pilot",
        price: "₹0",
        period: "for 4 weeks",
        description: "Limited to the first 10 businesses. No credit card required.",
        features: [
            "All core booking features",
            "Public booking page",
            "Calendar & client management",
            "Single staff member",
            "Direct support from our team",
        ],
        cta: "Apply for pilot",
        href: "/pilot",
        highlight: true,
        badge: "Limited spots",
    },
    // {
    //     name: "Basic",
    //     price: "₹X",
    //     period: "/month",
    //     description: "Core booking features for a growing service business.",
    //     features: [
    //         "Online booking page",
    //         "Calendar management",
    //         "Client records & history",
    //         "Up to 3 staff members",
    //         "Email support",
    //     ],
    //     cta: "Get started",
    //     href: "/contact",
    //     highlight: false,
    // },
    // {
    //     name: "Standard",
    //     price: "₹N",
    //     period: "/month",
    //     description: "More power for busy teams that want to grow.",
    //     features: [
    //         "Everything in Basic",
    //         "SMS appointment reminders",
    //         "Analytics & reporting",
    //         "Unlimited staff members",
    //         "Priority support",
    //     ],
    //     cta: "Get started",
    //     href: "/contact",
    //     highlight: false,
    // },
];

export default function PricingPage() {
    return (
        <>
            <section className="border-b">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
                    <div className="mx-auto max-w-3xl text-center">
                        <Badge variant="secondary" className="mb-4">
                            BookMi pricing
                        </Badge>
                        <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                            Simple, honest pricing
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-muted-foreground leading-relaxed text-pretty sm:text-lg">
                            Start free, upgrade when you&apos;re ready. All prices in Indian
                            Rupees (₹).
                        </p>
                    </div>
                </div>
            </section>

            <section>
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
                    <div
                        className={cn(
                            "grid gap-6",
                            plans.length === 1
                                ? "mx-auto max-w-md"
                                : "lg:grid-cols-3"
                        )}
                    >
                        {plans.map((plan) => (
                            <Card
                                key={plan.name}
                                className={cn(
                                    "flex flex-col justify-between",
                                    plan.highlight && "ring-2 ring-primary"
                                )}
                            >
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">{plan.name}</CardTitle>
                                        {plan.badge && (
                                            <Badge variant="default">
                                                <Sparkles className="size-3" />
                                                {plan.badge}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-baseline gap-1">
                                        <span className="font-heading text-3xl font-semibold tracking-tight">
                                            {plan.price}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {plan.period}
                                        </span>
                                    </div>
                                    <CardDescription className="mt-2 text-sm">
                                        {plan.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="flex flex-col gap-3">
                                        {plan.features.map((feature) => (
                                            <li
                                                key={feature}
                                                className="flex items-start gap-2.5 text-sm"
                                            >
                                                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                    <Check className="size-2.5" />
                                                </span>
                                                <span className="leading-relaxed">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        size="lg"
                                        variant={plan.highlight ? "default" : "outline"}
                                        className="w-full"
                                        asChild
                                    >
                                        <Link href={plan.href}>
                                            {plan.cta}
                                            <ArrowRight data-icon="inline-end" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    <p className="mt-10 text-center text-sm text-muted-foreground">
                        Currently accepting pilot businesses — salons and beauty studios.
                    </p>
                </div>
            </section>
        </>
    );
}
