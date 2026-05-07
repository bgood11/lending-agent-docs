// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://lending-agent-docs.vercel.app',
	integrations: [
		starlight({
			title: 'Lending Agent',
			description:
				'Implementation, architecture, safety, privacy, and regulatory guidance for the Lending Agent agentic credit broking demo.',
			logo: { src: './src/assets/logo.svg', replacesTitle: false },
			favicon: '/favicon.svg',
			customCss: ['./src/styles/custom.css'],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/bgood11/lending-agent' },
				{ icon: 'external', label: 'Live demo', href: 'https://lending-agent.vercel.app' },
			],
			editLink: {
				baseUrl: 'https://github.com/bgood11/lending-agent-docs/edit/main/',
			},
			lastUpdated: true,
			pagination: true,
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			sidebar: [
				{
					label: 'Introduction',
					items: [
						{ label: 'What it is', slug: 'introduction/what-it-is' },
						{ label: 'How it works', slug: 'introduction/how-it-works' },
						{ label: "Who it's for", slug: 'introduction/who-its-for' },
						{ label: 'Live simulation', slug: 'introduction/live-simulation' },
					],
				},
				{
					label: 'Product',
					items: [
						{ label: 'Customer journey', slug: 'product/customer-journey' },
						{ label: 'Installer surface', slug: 'product/installer-surface' },
						{ label: 'Audit & replay', slug: 'product/audit-and-replay' },
						{ label: 'Trust gradient', slug: 'product/trust-gradient' },
						{ label: 'Withdraw and outcomes', slug: 'product/withdraw-and-outcomes' },
					],
				},
				{
					label: 'Architecture',
					items: [
						{ label: 'Overview', slug: 'architecture/overview' },
						{ label: 'State machine', slug: 'architecture/state-machine' },
						{ label: 'Reconciliation', slug: 'architecture/reconciliation' },
						{ label: 'Event protocol', slug: 'architecture/event-protocol' },
						{ label: 'Cold-start recovery', slug: 'architecture/cold-start-recovery' },
						{ label: 'Mock-vs-real boundary', slug: 'architecture/mock-vs-real' },
					],
				},
				{
					label: 'Implementation',
					items: [
						{
							label: 'For retailers',
							items: [
								{ label: 'Adoption path', slug: 'implementation/retailers/adoption-path' },
								{ label: 'Integration patterns', slug: 'implementation/retailers/integration-patterns' },
								{ label: 'Branding & white-label', slug: 'implementation/retailers/branding' },
								{ label: 'Pilot playbook', slug: 'implementation/retailers/pilot-playbook' },
							],
						},
						{
							label: 'For brokers',
							items: [
								{ label: 'Adoption path', slug: 'implementation/brokers/adoption-path' },
								{ label: 'Lender panel integration', slug: 'implementation/brokers/lender-panel' },
								{ label: 'Disclosure publishing', slug: 'implementation/brokers/disclosure-publishing' },
								{ label: 'Audit & replay integration', slug: 'implementation/brokers/audit-integration' },
								{ label: 'Vulnerability process', slug: 'implementation/brokers/vulnerability-process' },
							],
						},
						{
							label: 'For lenders',
							items: [
								{ label: 'Waterfall protocol', slug: 'implementation/lenders/waterfall-protocol' },
								{ label: 'Counter-offer mechanics', slug: 'implementation/lenders/counter-offers' },
								{ label: 'Data minimisation', slug: 'implementation/lenders/data-minimisation' },
								{ label: 'Decision API adapter', slug: 'implementation/lenders/decision-api' },
							],
						},
					],
				},
				{
					label: 'Safety',
					items: [
						{ label: 'Overview', slug: 'safety/overview' },
						{ label: 'Threat model', slug: 'safety/threat-model' },
						{ label: 'Prompt injection', slug: 'safety/prompt-injection' },
						{ label: 'Hallucination', slug: 'safety/hallucination' },
						{ label: 'Fail-safe state machine', slug: 'safety/fail-safe-state-machine' },
						{ label: 'Empty-turn protection', slug: 'safety/empty-turn-protection' },
						{ label: 'Vulnerable customer protection', slug: 'safety/vulnerable-customer-protection' },
						{ label: 'Model evaluations', slug: 'safety/model-evaluations' },
					],
				},
				{
					label: 'Privacy',
					items: [
						{ label: 'Overview', slug: 'privacy/overview' },
						{ label: 'Data flow', slug: 'privacy/data-flow' },
						{ label: 'UK GDPR', slug: 'privacy/uk-gdpr' },
						{ label: 'DPIA', slug: 'privacy/dpia' },
						{ label: 'Data minimisation', slug: 'privacy/data-minimisation' },
						{ label: 'Retention', slug: 'privacy/retention' },
						{ label: 'Sub-processors', slug: 'privacy/sub-processors' },
						{ label: 'PECR & cookies', slug: 'privacy/pecr-and-cookies' },
					],
				},
				{
					label: 'Regulatory',
					items: [
						{ label: 'Overview', slug: 'regulatory/overview' },
						{ label: 'Consumer Duty', slug: 'regulatory/consumer-duty' },
						{ label: 'CONC', slug: 'regulatory/conc' },
						{ label: 'FCA AI strategy', slug: 'regulatory/fca-ai-strategy' },
						{ label: 'Vulnerable customers', slug: 'regulatory/vulnerable-customers' },
						{ label: 'Principles & SMCR', slug: 'regulatory/principles-smcr' },
						{ label: 'Replay & evidence', slug: 'regulatory/replay-and-evidence' },
					],
				},
				{
					label: 'Deploy',
					items: [
						{ label: 'Local development', slug: 'deploy/local' },
						{ label: 'Vercel', slug: 'deploy/vercel' },
						{ label: 'Custom domain', slug: 'deploy/custom-domain' },
						{ label: 'Production hardening', slug: 'deploy/production-hardening' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Event taxonomy', slug: 'reference/events' },
						{ label: 'State types', slug: 'reference/types' },
						{ label: 'API routes', slug: 'reference/api-routes' },
						{ label: 'Glossary', slug: 'reference/glossary' },
					],
				},
			],
		}),
	],
});
