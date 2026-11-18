// Script for "The 22 main concepts of AI — explained simply for a Chief AI Product Officer".
// Each concept: on-screen text (title, analogy, 3 points, takeaway) + narration per reveal step.
// Narration is written for the ear; speech.js rewrites acronyms so the voice reads them correctly.

module.exports = {
  intro: [
    {
      say: "Welcome. This video explains the 22 main concepts of AI, one by one, in plain language. It is made for you, as a Chief AI Product Officer.",
    },
    {
      say: "For each concept you get three things: a simple analogy, the three points that matter, and what it means for your product decisions. Let's go.",
    },
  ],

  concepts: [
    {
      n: 1, color: "#7c3aed", title: "Tokens and embeddings",
      analogy: "Tokens are the Lego bricks of text. Embeddings are GPS coordinates for meaning.",
      points: [
        "AI reads text in small chunks called tokens (about ¾ of a word)",
        "You pay per token, and every model limit is counted in tokens",
        "Embeddings turn text into numbers, so similar meanings sit close together",
      ],
      takeaway: "Tokens are your cost and speed meter. Embeddings power search, recommendations and RAG.",
      say: [
        "Number 1. Tokens and embeddings. Tokens are the Lego bricks of text. Embeddings are GPS coordinates for meaning.",
        "An AI model does not read whole words. It reads small chunks called tokens. One token is roughly three quarters of a word.",
        "This matters because you pay per token, and every limit, like how much a model can read at once, is counted in tokens.",
        "Embeddings turn a piece of text into a long list of numbers. Texts with similar meaning end up close together, so king sits near queen, and refund sits near money back.",
        "For you: tokens are your cost and speed meter. Embeddings are the engine behind smart search, recommendations, and RAG.",
      ],
    },
    {
      n: 2, color: "#4f46e5", title: "Prompt engineering",
      analogy: "Writing a great brief for a brilliant new hire who knows nothing about your company.",
      points: [
        "Say who it is, what the task is, the context, and the format you want",
        "Show examples of good answers, and ask it to think step by step",
        "Test and improve prompts like you would test product copy",
      ],
      takeaway: "The cheapest, fastest lever you have. Treat prompts as product assets: owned, versioned, tested.",
      say: [
        "Number 2. Prompt engineering. Think of it as writing a great brief for a brilliant new hire who knows nothing about your company.",
        "A good prompt says who the AI should be, what the task is, the background it needs, and the exact format you want back.",
        "Showing one or two examples of a good answer helps a lot. So does asking it to think step by step before answering.",
        "And you never get it perfect the first time. You test and improve prompts, just like you would test product copy.",
        "For you: prompting is the cheapest and fastest lever you have. Treat prompts as product assets. Someone owns them, they are versioned, and they are tested.",
      ],
    },
    {
      n: 3, color: "#5b4be0", title: "LLM concepts",
      analogy: "A super-powered autocomplete that has read a large part of the internet.",
      points: [
        "It predicts the next token, one at a time — it is not looking facts up",
        "Trained in stages: read everything, then learn to follow instructions",
        "Key terms: context window, temperature, knowledge cutoff, hallucination",
      ],
      takeaway: "It is probabilistic, not a database. Design products for “usually right”, with checks.",
      say: [
        "Number 3. LLM concepts. A large language model is a super-powered autocomplete that has read a large part of the internet.",
        "It works by predicting the next token, one at a time. It is not looking facts up in a database. It is producing the most likely continuation.",
        "It is trained in stages. First it reads a huge amount of text. Then it is trained to follow instructions and be helpful and safe.",
        "Four words to know. The context window is its short-term memory. Temperature controls how creative it is. The knowledge cutoff is when its reading stopped. And a hallucination is a confident answer that is simply wrong.",
        "For you: the model is probabilistic, not a database. Design your products for usually right, and add checks where being wrong is expensive.",
      ],
    },
    {
      n: 4, color: "#2f7fc1", title: "AI chat assistants",
      analogy: "A powerful engine (the LLM) put inside a car that people can actually drive.",
      points: [
        "ChatGPT, Claude, Gemini, Copilot: a model wrapped in a product",
        "The wrapper adds chat history, instructions, files, web search and memory",
        "Users judge the whole experience, not the model behind it",
      ],
      takeaway: "Models are becoming a commodity. Your edge is your data, your workflow and your user experience.",
      say: [
        "Number 4. AI chat assistants. Think of the model as a powerful engine, and the chat assistant as the car that people can actually drive.",
        "ChatGPT, Claude, Gemini and Copilot are all a model wrapped inside a product.",
        "The wrapper adds the useful parts: conversation history, standing instructions, file upload, web search, and memory of the user.",
        "Users judge the whole experience. They rarely know, or care, which model is behind it.",
        "For you: models are becoming a commodity. Your real edge is your data, your workflow, and your user experience.",
      ],
    },
    {
      n: 5, color: "#2e8b6e", title: "Vector databases",
      analogy: "A library organised by meaning instead of by alphabet.",
      points: [
        "Stores the embeddings (meaning fingerprints) of your documents",
        "“How do I get my money back?” finds the Returns Policy — no shared words needed",
        "Examples: Pinecone, Weaviate, Qdrant, or Postgres with pgvector",
      ],
      takeaway: "Core infrastructure for letting AI use your company’s own knowledge.",
      say: [
        "Number 5. Vector databases. Imagine a library organised by meaning, instead of by alphabet.",
        "A vector database stores the embeddings of your documents. Think of each one as a meaning fingerprint.",
        "So when a customer asks, how do I get my money back, it finds your returns policy, even though the two don't share a single word.",
        "Popular examples are Pinecone, Weaviate, and Qdrant, or simply Postgres with a vector add-on.",
        "For you: this is core infrastructure for letting AI use your company's own knowledge.",
      ],
    },
    {
      n: 6, color: "#2a7f78", title: "Vector indexing",
      analogy: "The library’s map, so you don’t have to walk past every shelf.",
      points: [
        "Comparing a question with millions of vectors one by one is too slow",
        "Indexes group neighbours together for near-instant, “good enough” search",
        "Trade-off: speed vs. accuracy vs. memory cost — and how you cut documents matters",
      ],
      takeaway: "This is where search quality and infrastructure cost are tuned. Ask your team about recall and latency.",
      say: [
        "Number 6. Vector indexing. If the vector database is the library, the index is its map, so you don't have to walk past every shelf.",
        "Comparing a question against millions of vectors, one by one, is far too slow for a live product.",
        "An index groups similar items together, so the search can jump to the right neighbourhood and answer almost instantly. The result is approximate, but good enough.",
        "There is always a trade-off between speed, accuracy, and memory cost. And how you cut documents into chunks matters as much as the index itself.",
        "For you: this is where search quality and infrastructure cost get tuned. Ask your team two questions. What is our recall, meaning how often do we find the right document? And what is our latency?",
      ],
    },
    {
      n: 7, color: "#259a6c", title: "RAG (Retrieval-Augmented Generation)",
      analogy: "An open-book exam: the model looks up the right pages before it answers.",
      points: [
        "Retrieve: find the most relevant passages in your own data",
        "Augment and generate: add them to the prompt; the model answers from them and cites sources",
        "Fewer hallucinations, always up to date — but only as good as the retrieval",
      ],
      takeaway: "The default pattern for enterprise AI on private knowledge. No retraining needed.",
      say: [
        "Number 7. RAG, which stands for retrieval augmented generation. Think of an open-book exam. The model looks up the right pages before it answers.",
        "Step one: retrieve the most relevant passages from your own data, usually with the vector database we just covered.",
        "Step two: put those passages into the prompt. Step three: the model writes its answer using them, and can cite its sources.",
        "This means fewer hallucinations and answers that are always up to date. But remember, garbage in, garbage out. RAG is only as good as its retrieval.",
        "For you: RAG is the default pattern for enterprise AI on private knowledge. And you don't need to retrain any model.",
      ],
    },
    {
      n: 8, color: "#d97a2b", title: "Fine-tuning vs RAG vs prompting",
      analogy: "Prompting = giving instructions. RAG = handing over a reference book. Fine-tuning = sending to training school.",
      points: [
        "Prompting: start here — minutes, cheap, easy to change",
        "RAG: when the model needs facts it doesn’t know, or that change often",
        "Fine-tuning: for a consistent style, format or niche skill at scale — costly, needs data",
      ],
      takeaway: "Rule of thumb: prompt → RAG → fine-tune. Most teams never need step three.",
      say: [
        "Number 8. Fine-tuning versus RAG versus prompting. Prompting is giving instructions. RAG is handing over a reference book. Fine-tuning is sending the model to training school.",
        "Always start with prompting. It takes minutes, it's cheap, and it's easy to change.",
        "Add RAG when the model needs facts it doesn't know, like your policies, or facts that change often, like prices or stock.",
        "Use fine-tuning when you need a very consistent style, format, or a niche skill, at large scale. It is costly, slower to change, and needs good training data.",
        "For you: the rule of thumb is prompt first, then RAG, then fine-tune. Most teams never need step three.",
      ],
    },
    {
      n: 9, color: "#5048e5", title: "AI agents",
      analogy: "Moving from an advisor who tells you what to do, to an assistant who does it.",
      points: [
        "An LLM in a loop: think → act with a tool → look at the result → repeat",
        "Tools can be search, APIs, code, email, calendars, databases",
        "It works towards a goal with some independence",
      ],
      takeaway: "From answering questions to completing tasks. Bigger value, bigger risk — decide what it may do alone.",
      say: [
        "Number 9. AI agents. This is the move from an advisor who tells you what to do, to an assistant who actually does it.",
        "An agent is a language model running in a loop. It thinks, takes an action with a tool, looks at the result, and repeats until the job is done.",
        "The tools can be web search, APIs, running code, sending email, booking calendars, or querying databases.",
        "So instead of following a fixed script, it works towards a goal with some independence.",
        "For you: agents move AI from answering questions to completing tasks. That means bigger value, and bigger risk. Decide clearly what it may do alone, and what needs a human.",
      ],
    },
    {
      n: 10, color: "#c8762a", title: "Agentic patterns",
      analogy: "Proven playbooks for how an agent should work — like management methods for AI.",
      points: [
        "Reflection: draft, critique itself, improve",
        "Planning and tool use: break a big goal into steps, pick the right tool",
        "Routing, chaining and human-in-the-loop for approvals",
      ],
      takeaway: "Pick the simplest pattern that works. Simple workflows beat fancy autonomy in production.",
      say: [
        "Number 10. Agentic patterns. These are proven playbooks for how an agent should work. Think of them as management methods for AI.",
        "Reflection: the agent writes a draft, critiques its own work, and improves it.",
        "Planning and tool use: it breaks a big goal into small steps, and picks the right tool for each step.",
        "Routing sends each request down the right path. Chaining links steps together. And human in the loop means a person approves the important decisions.",
        "For you: pick the simplest pattern that works. In production, simple and predictable workflows beat fancy autonomy.",
      ],
    },
    {
      n: 11, color: "#7c3aed", title: "Multi-agent architectures",
      analogy: "A team of specialists with a manager, instead of one generalist doing everything.",
      points: [
        "An orchestrator splits the work; specialists research, write, check",
        "Common shapes: manager–workers, assembly line, reviewer / debate",
        "Gains: focus and parallel work. Costs: more tokens, more ways to fail",
      ],
      takeaway: "Use it only when one agent clearly can’t cope. Start with one.",
      say: [
        "Number 11. Multi-agent architectures. Instead of one generalist doing everything, you have a team of specialists with a manager.",
        "An orchestrator agent splits up the work. Specialist agents then research, write, or check quality.",
        "Common shapes are a manager with workers, an assembly line where each agent hands over to the next, or a reviewer that challenges another agent's work.",
        "You gain focus and parallel work. But you pay with more tokens, more cost, and more ways for things to go wrong between agents.",
        "For you: use multiple agents only when one agent clearly can't cope. Always start with one.",
      ],
    },
    {
      n: 12, color: "#2b8fae", title: "Designing an AI agent",
      analogy: "Hiring and onboarding a digital employee.",
      points: [
        "Job description: goal, scope, what success looks like",
        "Tools and permissions (only what it needs), instructions, memory",
        "Plan for failure: guardrails, hand-off to humans, logs, real-world tests",
      ],
      takeaway: "Write the agent’s job description before anyone writes code.",
      say: [
        "Number 12. Designing an AI agent. Treat it like hiring and onboarding a digital employee.",
        "First, write the job description. What is the goal, what is in and out of scope, and what does success look like?",
        "Then give it tools and permissions, but only the ones it needs. Add clear instructions, and decide what it should remember.",
        "Finally, plan for failure. Add guardrails, a clean hand-off to a human, logs of every action, and test it on real scenarios before launch.",
        "For you: write the agent's job description before anyone writes code. That one page is your product spec.",
      ],
    },
    {
      n: 13, color: "#1f2937", title: "MCP (Model Context Protocol)",
      analogy: "USB-C for AI: one standard plug between AI apps and your tools and data.",
      points: [
        "Open standard introduced by Anthropic in 2024, now widely adopted",
        "Build a connector once (Slack, Drive, your CRM) — any MCP-ready AI can use it",
        "Exposes tools, data and prompts in a standard way",
      ],
      takeaway: "Lower integration cost and less lock-in. Make your product MCP-ready — and vet the servers you trust.",
      say: [
        "Number 13. MCP, the model context protocol. Think of it as USB-C for AI. One standard plug between AI apps and your tools and data.",
        "It is an open standard, introduced by Anthropic in 2024, and now widely adopted across the industry.",
        "You build a connector once, for example to Slack, Google Drive, or your CRM, and any MCP-ready AI application can use it.",
        "It exposes tools, data, and prompt templates in one standard way, so you stop building custom integrations for every model.",
        "For you: MCP lowers integration cost and reduces lock-in. Make your own product MCP-ready, so AI assistants can plug into it. And only connect servers you trust, because each one is a door into your data.",
      ],
    },
    {
      n: 14, color: "#3b6fd6", title: "AI coding workflow",
      analogy: "A tireless pair programmer — the engineer becomes the director and reviewer.",
      points: [
        "From autocomplete → chat → coding agents that edit, test and open pull requests",
        "Engineers plan, delegate and review instead of typing every line",
        "Works best with clear specs, good tests and strong code review",
      ],
      takeaway: "Real productivity gains, but keep the quality gates. Measure outcomes, not lines of code.",
      say: [
        "Number 14. The AI coding workflow. Think of a tireless pair programmer, where the engineer becomes the director and reviewer.",
        "Tools have moved from autocomplete, to chat, to coding agents like Claude Code, Cursor, and Copilot, which edit files, run tests, and open pull requests on their own.",
        "Engineers now spend more time planning, delegating, and reviewing, and less time typing every line.",
        "It works best when you have clear specs, good automated tests, and strong code review.",
        "For you: the productivity gains are real, but keep the quality gates. Measure shipped outcomes, not lines of code.",
      ],
    },
    {
      n: 15, color: "#2f7fc1", title: "LLM evaluations",
      analogy: "Report cards and unit tests for your AI.",
      points: [
        "Build a test set of real examples with what a good answer looks like",
        "Score with rules, human reviewers, or another LLM as a judge",
        "Re-run on every change — prompt, model or data — to catch regressions",
      ],
      takeaway: "No evals, no launch. Evals are your product-quality spec.",
      say: [
        "Number 15. LLM evaluations, or evals. These are report cards and unit tests for your AI.",
        "You build a test set of real examples, each with a description of what a good answer looks like.",
        "Then you score the answers, using simple rules, human reviewers, or another language model acting as a judge.",
        "You re-run the evals on every change, a new prompt, a new model, or new data, so you catch anything that got worse.",
        "For you: no evals, no launch. Evals are your product quality spec, written in a form a machine can check.",
      ],
    },
    {
      n: 16, color: "#c43c6f", title: "Context engineering",
      analogy: "Packing the perfect briefcase before a meeting — everything needed, nothing extra.",
      points: [
        "The context window is limited, and too much information distracts the model",
        "Decide what goes in: instructions, documents, history, tool results, memory",
        "Summarise, fetch information just in time, and keep it well structured",
      ],
      takeaway: "The next step after prompt engineering. Most agent failures are really context failures.",
      say: [
        "Number 16. Context engineering. It's like packing the perfect briefcase before a meeting. Everything you need, and nothing extra.",
        "The context window is limited. And even when it's large, too much information distracts the model and lowers quality.",
        "So you decide carefully what goes in: the instructions, the relevant documents, the conversation history, tool results, and memories.",
        "Good teams summarise long histories, fetch information just in time, and keep everything clearly structured.",
        "For you: this is the next step after prompt engineering. When an agent fails, it is usually a context failure, not a model failure.",
      ],
    },
    {
      n: 17, color: "#5048e5", title: "LLM system architecture",
      analogy: "The model is the engine — you still need the rest of the car.",
      points: [
        "Layers: app → orchestration → model gateway → one or more models",
        "Plus data and RAG, tools, caching, logging, guardrails and evals",
        "A model gateway lets you switch providers without a rebuild",
      ],
      takeaway: "Don’t lock into one model. Invest in the platform layers that will outlive any model.",
      say: [
        "Number 17. LLM system architecture. The model is the engine, but you still need the rest of the car.",
        "A typical system has layers: the user facing app, an orchestration layer with the business logic, a model gateway, and one or more models behind it.",
        "Around that sit your data and RAG pipeline, tools, caching, logging and monitoring, guardrails, and evals.",
        "The model gateway is important. It lets you switch between providers, or use cheaper models for easy tasks, without rebuilding everything.",
        "For you: don't lock into one model. Invest in the platform layers that will outlive any single model.",
      ],
    },
    {
      n: 18, color: "#d23c55", title: "Guardrails and safety",
      analogy: "Seatbelts, brakes and airbags — they let you drive fast safely.",
      points: [
        "Input checks: block prompt injection, harmful requests, sensitive data",
        "Output checks: facts, toxicity, personal data, correct format",
        "Least-privilege permissions, human approval for risky actions, red-teaming, audit logs",
      ],
      takeaway: "Trust is the product. Good safety lets you move faster, not slower. Mind regulation like the EU AI Act.",
      say: [
        "Number 18. Guardrails and safety. Think seatbelts, brakes, and airbags. They are what let you drive fast, safely.",
        "Input checks stop problems coming in: prompt injection attacks, harmful requests, and sensitive data that should never reach the model.",
        "Output checks stop problems going out: wrong facts, toxic language, leaked personal data, or answers in the wrong format.",
        "On top of that: give agents only the permissions they need, require human approval for risky actions, red-team your system by attacking it yourself, and keep audit logs.",
        "For you: trust is the product. Good safety lets you move faster, not slower. And keep an eye on regulation, like the EU AI Act.",
      ],
    },
    {
      n: 19, color: "#d4862a", title: "Reinforcement learning",
      analogy: "Training a dog with treats: good behaviour gets rewarded, so it happens more.",
      points: [
        "The model learns by trial and error, guided by rewards",
        "RLHF: humans rank answers, the model learns to prefer the good ones",
        "Rewards on checkable results (maths, code) created today’s reasoning models",
      ],
      takeaway: "This is why models keep getting better at reasoning. Your users’ feedback is valuable training fuel.",
      say: [
        "Number 19. Reinforcement learning. It's like training a dog with treats. Good behaviour gets rewarded, so it happens more often.",
        "The model learns by trial and error, guided by a reward signal, instead of just copying examples.",
        "RLHF, reinforcement learning from human feedback, is where people rank answers, and the model learns to prefer the good ones. That is what made chatbots genuinely helpful.",
        "More recently, models are rewarded for results that can be checked, like correct maths or code that passes tests. That created today's reasoning models, which think longer before they answer.",
        "For you: this is why models keep getting better at reasoning. And your users' feedback, every thumbs up and thumbs down, is valuable fuel for improvement.",
      ],
    },
    {
      n: 20, color: "#2f9a55", title: "Cost and scaling",
      analogy: "Running a taxi fleet: every kilometre — every token — costs money.",
      points: [
        "Cost ≈ tokens × price per token × number of requests",
        "Levers: right-size the model, caching, batching, shorter prompts, smart routing",
        "Also watch speed (latency), rate limits and cost per user or per task",
      ],
      takeaway: "Track cost per task from day one. Prices fall fast, but usage grows even faster.",
      say: [
        "Number 20. Cost and scaling. It's like running a taxi fleet. Every kilometre, or here, every token, costs money.",
        "The basic maths is simple. Cost is roughly tokens, times price per token, times the number of requests. Output tokens and the biggest models cost the most.",
        "Your main levers: use a small model for easy tasks, cache repeated work, batch jobs that aren't urgent, keep prompts short, and route each request to the cheapest model that can handle it.",
        "Also watch speed, the provider's rate limits, and your unit economics, meaning the cost per user or per task.",
        "For you: track cost per task from day one. Prices fall fast, but usage grows even faster.",
      ],
    },
    {
      n: 21, color: "#2a8a5e", title: "Agent memory and state",
      analogy: "A notebook, so the assistant doesn’t meet you as a stranger every morning.",
      points: [
        "Short-term memory: the current conversation inside the context window",
        "Long-term memory: facts, preferences and past results saved and recalled when needed",
        "State: where it is in a multi-step task, so it can pause and resume",
      ],
      takeaway: "Memory drives personalisation and loyalty — but users must be able to see and delete it.",
      say: [
        "Number 21. Agent memory and state. Think of it as a notebook, so the assistant doesn't meet you as a stranger every morning.",
        "Short-term memory is the current conversation, held inside the context window.",
        "Long-term memory stores facts, preferences, and past results in a database, and brings back the relevant pieces when they're needed.",
        "State is where the agent is in a multi-step task, so it can pause, wait for an approval, and pick up exactly where it left off.",
        "For you: memory drives personalisation and loyalty. But it also holds personal data, so users must be able to see and delete what the AI remembers.",
      ],
    },
    {
      n: 22, color: "#d23c55", title: "AI system design",
      analogy: "The architect’s blueprint that puts all 21 building blocks together.",
      points: [
        "Start from the user problem and success metrics — not from the model",
        "Pick the blocks: prompts, RAG, agents, MCP tools, memory, guardrails, evals",
        "Design for quality, cost, speed, safety — and for models being replaced",
      ],
      takeaway: "Your job: choose the right problems, define what “good” means, and build a learning loop.",
      say: [
        "Number 22. AI system design. This is the architect's blueprint that puts all the other building blocks together.",
        "Always start from the user problem and the success metrics. Not from the model, and not from the latest hype.",
        "Then pick the building blocks you need: prompts, RAG, agents, MCP tools, memory, guardrails, and evals.",
        "Design for quality, cost, speed, and safety, and assume the model will be replaced, probably within a year.",
        "For you: your job is to choose the right problems, define what good looks like, and build a learning loop that makes the product better every week.",
      ],
    },
  ],

  outro: [
    {
      say: "Let's wrap up with three things to remember.",
    },
    {
      say: "One. Start simple. Prompt first, then RAG, then agents. Two. Measure everything: quality with evals, and money with cost per task. Three. Build for change, because the models will keep improving, and your platform should let you swap them easily. Thanks for watching.",
    },
  ],

  outroPoints: [
    "Start simple: prompt → RAG → agents",
    "Measure everything: quality (evals) and cost per task",
    "Build for change: models will keep getting replaced",
  ],
};
