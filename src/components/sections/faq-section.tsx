"use client";

import { motion } from "motion/react";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: "item-1",
    question: "How is my Developer Score and Tier calculated?",
    answer:
      "Your Developer Score uses a weighted algorithm factoring in verified public commits, pull request volume and merge rate, code review contributions, total repository stars, and active contribution streaks. Based on this composite score, developers are placed into competitive tiers ranging from Bronze and Silver up to Grandmaster and Mythic.",
  },
  {
    id: "item-2",
    question: "Are my private repositories analyzed or stored?",
    answer:
      "No. CodePulse strictly inspects public GitHub metadata via the GitHub GraphQL & REST APIs. We never request private repo scopes, clone your private source code, or store proprietary code on our servers. Your codebase privacy and security remain 100% under your control.",
  },
  {
    id: "item-3",
    question: "How do Developer Battles work?",
    answer:
      "Developer Battles match two developers head-to-head across multiple coding pillars—including commit cadence, open-source impact, PR efficiency, repository reach, and consistency streaks. The algorithm calculates round-by-round point differentials and updates competitive ELO ratings upon match completion.",
  },
  {
    id: "item-4",
    question: "How often are my GitHub contributions synced?",
    answer:
      "Public stats sync automatically whenever you log into CodePulse or initiate a battle. Additionally, an automated background worker syncs active accounts periodically to preserve continuous streaks and keep global leaderboard standings fresh.",
  },
  {
    id: "item-5",
    question: "Is CodePulse completely free and open-source?",
    answer:
      "Yes! CodePulse is free to use for individual developers and fully open-source under the MIT license. You can audit the codebase, suggest new features, report bugs, or submit contributions directly on our GitHub repository.",
  },
];

export function FAQSection() {
  return (
    <section className="py-24 px-6 relative z-10" id="faq">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 text-sky-400 bg-sky-500/10 border border-sky-500/20"
          >
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            Frequently Asked Questions
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4"
          >
            Got Questions? We&apos;ve Got{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
              Answers
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-2xl mx-auto text-base md:text-lg"
          >
            Everything you need to know about rankings, developer battles, data privacy, and CodePulse platform mechanics.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl p-6 md:p-8 backdrop-blur-xl bg-slate-900/60 border border-slate-800 shadow-2xl relative"
        >
          <Accordion className="space-y-3">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-950/40 px-5 transition-colors hover:border-slate-700/80 data-open:border-sky-500/30 data-open:bg-slate-900/80"
              >
                <AccordionTrigger className="py-4 text-left font-semibold text-white hover:no-underline text-base md:text-lg hover:text-sky-300">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 text-sm md:text-base leading-relaxed pb-5 pt-1">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
