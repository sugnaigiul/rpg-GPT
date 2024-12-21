import * as webllm from "https://esm.run/@mlc-ai/web-llm";

class StoryGame {
  constructor() {
    this.messages = [
      {
        content:
          'You are an expert RPG game master creating an immersive first-person adventure. Write in second person perspective ("you") and include basic RPG elements like character interactions and decisions. Provide exactly 4 choices for the player after each segment. Keep descriptions vivid but concise.',
        role: "system",
      },
    ];

    this.summarizerMessages = [
      {
        content:
          "You are a concise story context summarizer. Create a brief 2-3 sentence summary that captures the essential elements of the user's desired story setting. Focus on key themes, setting, and tone. Respond with ONLY the summary - no introductory phrases or meta-text.",
        role: "system",
      },
    ];

    this.engine = new webllm.MLCEngine();
    this.selectedModel = "Llama-3.2-3B-Instruct-q4f32_1-MLC";
    this.initializeElements();
    this.setupEventListeners();
    this.setupModelSelection();
    this.currentSummary = null;
    this.loadingIndicator = document.getElementById("loading-indicator");
  }

  initializeElements() {
    // Get all necessary DOM elements
    this.downloadBtn = document.getElementById("download");
    this.modelSelect = document.getElementById("model-selection");
    this.downloadStatus = document.getElementById("download-status");
    this.genreContainer = document.querySelector(".genre-container");
    this.genreSelect = document.getElementById("genre-selection");
    this.startStoryBtn = document.getElementById("start-story");
    this.storyContainer = document.querySelector(".story-container");
    this.storyBox = document.getElementById("story-box");
    this.choiceButtons = [
      document.getElementById("choice1"),
      document.getElementById("choice2"),
      document.getElementById("choice3"),
      document.getElementById("choice4"),
    ];
    // Add new elements to existing initialization
    this.contextInput = document.getElementById("context-input");
    this.generateSummaryBtn = document.getElementById("generate-summary");
    this.summaryContainer = document.getElementById("summary-container");
    this.summaryText = document.getElementById("summary-text");
    this.acceptSummaryBtn = document.getElementById("accept-summary");
    this.rejectSummaryBtn = document.getElementById("reject-summary");
  }

  setupEventListeners() {
    this.downloadBtn.addEventListener("click", () => this.initializeModel());
    this.startStoryBtn.addEventListener("click", () => this.startStory());
    this.choiceButtons.forEach((button, index) => {
      button.addEventListener("click", () => this.handleChoice(index));
    });
    // Add new event listeners
    this.generateSummaryBtn.addEventListener("click", () =>
      this.generateContextSummary()
    );
    this.acceptSummaryBtn.addEventListener("click", () => this.acceptSummary());
    this.rejectSummaryBtn.addEventListener("click", () => this.rejectSummary());
  }

  setupModelSelection() {
    const availableModels = webllm.prebuiltAppConfig.model_list.map(
      (m) => m.model_id
    );
    availableModels.forEach((modelId) => {
      const option = document.createElement("option");
      option.value = modelId;
      option.textContent = modelId;
      this.modelSelect.appendChild(option);
    });
    this.modelSelect.value = this.selectedModel;
  }

  async initializeModel() {
    try {
      this.downloadBtn.disabled = true;
      const loadingIndicator = document.getElementById(
        "model-loading-indicator"
      );
      loadingIndicator.classList.remove("hidden");
      this.downloadStatus.classList.remove("hidden");

      // Set up progress callback
      this.engine.setInitProgressCallback((report) => {
        console.log("initialize", report.progress);
        this.downloadStatus.textContent = report.text;
      });

      // Initialize engine with selected model
      this.selectedModel = this.modelSelect.value;
      await this.engine.reload(this.selectedModel, {
        temperature: 0.7,
        top_p: 0.95,
      });

      this.downloadStatus.textContent = "Model ready!";
      this.genreContainer.classList.remove("hidden");

      // Hide loading indicator after completion
      setTimeout(() => {
        loadingIndicator.classList.add("hidden");
      }, 1000);
    } catch (error) {
      this.downloadStatus.textContent = "Error loading model: " + error.message;
      this.downloadBtn.disabled = false;
    }
  }

  async startStory() {
    if (!this.currentSummary) {
      alert("Please generate and accept a context summary first.");
      return;
    }

    this.startStoryBtn.style.display = "none";
    this.storyContainer.classList.remove("hidden");

    const prompt = `Using this context: ${this.currentSummary}
            
            Create the opening of a first-person RPG adventure based on this setting.
            Describe the player's initial situation in second person perspective ("you"), 
            setting the scene and immediate circumstance they find themselves in. 
            Keep it to 2-3 sentences and then provide exactly 4 possible choices for what to do next.
            
            Make sure the choices feel like actual RPG actions (like "Search the room", "Talk to the merchant", 
            "Draw your sword", etc.) rather than narrative choices.

            Format the choices as: CHOICES: 1)... 2)... 3)... 4)...`;

    await this.generateStorySegment(prompt);
  }

  parseResponse(response) {
    if (!response) return ["", []];

    try {
      // Split into story and choices sections
      const storyPart = response
        .split("CHOICES:")[0]
        .replace(/^STORY:\s*/i, "")
        .trim();

      const choicesPart = response.split("CHOICES:")[1] || "";

      let choices = choicesPart
        .split(/\d\)/)
        .filter((choice) => choice.trim())
        .map((choice) => choice.trim())
        .slice(0, 4);

      while (choices.length < 4) {
        choices.push(`Choice ${choices.length + 1}`);
      }

      return [storyPart, choices];
    } catch (error) {
      console.error("Error parsing response:", error);
      return [
        "An error occurred while generating the story.",
        ["Try again", "Restart", "Continue anyway", "Start over"],
      ];
    }
  }

  async handleChoice(choiceIndex) {
    const choiceText = this.choiceButtons[choiceIndex].textContent;

    // Clear all choice buttons immediately
    this.choiceButtons.forEach((button) => {
      button.textContent = "";
    });

    const prompt = `Continue the first-person RPG story based on the player choosing: "${choiceText}"

Write the next part in second person perspective ("you"), describing the immediate results 
of their action and the new situation they face (2-3 sentences). Then provide 4 new 
numbered choices that represent concrete actions the player can take.

Format your response as:

STORY: [Your story paragraph here]
CHOICES:
1) [First action]
2) [Second action]
3) [Third action]
4) [Fourth action]`;

    await this.generateStorySegment(prompt);
  }

  updateStoryText(text) {
    const [story] = this.parseResponse(text);
    if (story && story.trim()) {
      const cleanStory = story
        .replace(/^STORY:\s*/i, "")
        .split("CHOICES:")[0]
        .trim();

      if (!this.storyBox.querySelector(".current-segment")) {
        this.storyBox.innerHTML += `<p class="current-segment">${cleanStory}</p>`;
      } else {
        const currentSegment = this.storyBox.querySelector(".current-segment");
        currentSegment.textContent = cleanStory;
      }
    }
  }

  async generateStorySegment(prompt) {
    try {
      this.choiceButtons.forEach((btn) => {
        btn.disabled = true;
        btn.textContent = ""; // Clear initially
      });

      const message = {
        content: prompt,
        role: "user",
      };
      this.messages.push(message);

      let curMessage = "";
      const completion = await this.engine.chat.completions.create({
        stream: true,
        messages: this.messages,
      });

      const previousSegment = this.storyBox.querySelector(".current-segment");
      if (previousSegment) {
        previousSegment.classList.remove("current-segment");
      }

      let choicesDetected = false;

      for await (const chunk of completion) {
        const curDelta = chunk.choices[0].delta.content;
        if (curDelta) {
          curMessage += curDelta;

          // Check if we've hit the CHOICES section
          if (!choicesDetected && curMessage.includes("CHOICES:")) {
            choicesDetected = true;
            this.choiceButtons.forEach((btn) => {
              btn.textContent = "Generating choice...";
              btn.classList.add("generating");
            });
          }

          // Only update story text if it's not the "CHOICES:" marker
          const storyPart = curMessage.split("CHOICES:")[0];
          if (storyPart) {
            this.updateStoryText(storyPart);
          }
        }
      }

      const finalMessage = await this.engine.getMessage();
      this.messages.push({
        content: finalMessage,
        role: "assistant",
      });

      const [story, choices] = this.parseResponse(finalMessage);

      // Update the final story segment
      const currentSegment = this.storyBox.querySelector(".current-segment");
      if (currentSegment) {
        currentSegment.textContent = story.replace(/^STORY:\s*/i, "");
        currentSegment.classList.remove("current-segment");
      }

      this.updateChoices(choices);
      this.choiceButtons.forEach((btn) => (btn.disabled = false));
    } catch (error) {
      console.error("Error generating story:", error);
      this.storyBox.innerHTML += `<p>An error occurred while generating the story.</p>`;
      this.updateChoices(["Try again", "Try again", "Try again", "Try again"]);
    }
  }

  updateChoices(choices) {
    this.choiceButtons.forEach((button, index) => {
      button.classList.remove("generating");
      button.textContent = choices[index] || `Choice ${index + 1}`;
    });
  }

  async generateContextSummary() {
    const userContext = this.contextInput.value.trim();
    if (!userContext) {
      alert("Please enter a context for your story.");
      return;
    }

    // Disable input and button
    this.contextInput.disabled = true;
    this.generateSummaryBtn.disabled = true;

    // Show loading indicator
    this.loadingIndicator.classList.remove("hidden");

    try {
      const prompt = `Summarize the following story context in 2-3 clear, concise sentences that capture the essential elements: "${userContext}"`;

      const message = {
        content: prompt,
        role: "user",
      };
      this.summarizerMessages.push(message);

      const completion = await this.engine.chat.completions.create({
        messages: this.summarizerMessages,
      });

      const summary = completion.choices[0].message.content;
      this.currentSummary = summary;

      this.summaryText.textContent = summary;
      this.summaryContainer.classList.remove("hidden");
      this.startStoryBtn.classList.add("hidden");
    } catch (error) {
      console.error("Error generating summary:", error);
      this.summaryText.textContent =
        "An error occurred while generating the summary. Please try again.";

      // Re-enable input and button on error
      this.contextInput.disabled = false;
      this.generateSummaryBtn.disabled = false;
    } finally {
      // Hide loading indicator
      this.loadingIndicator.classList.add("hidden");
    }
  }

  acceptSummary() {
    this.summaryContainer.classList.add("hidden");
    this.startStoryBtn.classList.remove("hidden");
    this.startStoryBtn.style.display = "block";
    this.contextInput.disabled = true;
    this.generateSummaryBtn.disabled = true;
  }

  rejectSummary() {
    this.summaryContainer.classList.add("hidden");
    this.currentSummary = null;
    this.contextInput.disabled = false;
    this.generateSummaryBtn.disabled = false;
  }
}

// Initialize the game when the page loads
window.addEventListener("load", () => {
  const game = new StoryGame();
});
