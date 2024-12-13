import * as webllm from "https://esm.run/@mlc-ai/web-llm";

class StoryGame {
    constructor() {
        this.messages = [
            {
                content: "You are an expert RPG game master creating an immersive first-person adventure. Write in second person perspective (\"you\") and include basic RPG elements like character interactions and decisions. Provide exactly 4 choices for the player after each segment. Keep descriptions vivid but concise.",
                role: "system",
            }
        ];
        this.engine = new webllm.MLCEngine();
        this.selectedModel = "Llama-3-8B-Instruct-q4f32_1-MLC-1k"; // Base model
        this.initializeElements();
        this.setupEventListeners();
        this.setupModelSelection();
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
            document.getElementById("choice4")
        ];
    }

    setupEventListeners() {
        this.downloadBtn.addEventListener("click", () => this.initializeModel());
        this.startStoryBtn.addEventListener("click", () => this.startStory());
        this.choiceButtons.forEach((button, index) => {
            button.addEventListener("click", () => this.handleChoice(index));
        });
    }

    setupModelSelection() {
        const availableModels = webllm.prebuiltAppConfig.model_list.map(m => m.model_id);
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
        } catch (error) {
            this.downloadStatus.textContent = "Error loading model: " + error.message;
            this.downloadBtn.disabled = false;
        }
    }

    async startStory() {
        const genre = this.genreSelect.value;
        this.storyContainer.classList.remove("hidden");
        
        const prompt = `Create the opening of a first-person ${genre} RPG adventure. 
            Describe the player's initial situation in second person perspective ("you"), 
            setting the scene and immediate circumstance they find themselves in. 
            Keep it to 2-3 sentences and then provide exactly 4 possible choices for what to do next.
            
            Make sure the choices feel like actual RPG actions (like "Search the room", "Talk to the merchant", 
            "Draw your sword", etc.) rather than narrative choices.

            Some choices should be good, some should be bad, and some should be neutral.
            Some choices should have a chance to fail.
            
            Format the choices as: CHOICES: 1)... 2)... 3)... 4)...`;

        await this.generateStorySegment(prompt);
    }

    parseResponse(response) {
        if (!response) return ["", []];

        try {
            // Split into story and choices sections
            const storyPart = response.split('CHOICES:')[0]
                .replace(/^STORY:\s*/i, '')
                .trim();
            
            const choicesPart = response.split('CHOICES:')[1] || '';
            
            let choices = choicesPart
                .split(/\d\)/)
                .filter(choice => choice.trim())
                .map(choice => choice.trim())
                .slice(0, 4);

            while (choices.length < 4) {
                choices.push(`Choice ${choices.length + 1}`);
            }

            return [storyPart, choices];
        } catch (error) {
            console.error("Error parsing response:", error);
            return ["An error occurred while generating the story.", 
                ["Try again", "Restart", "Continue anyway", "Start over"]];
        }
    }

    async handleChoice(choiceIndex) {
        const choiceText = this.choiceButtons[choiceIndex].textContent;
        
        // Clear all choice buttons immediately
        this.choiceButtons.forEach(button => {
            button.textContent = '';
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
                .replace(/^STORY:\s*/i, '')
                .split('CHOICES:')[0] 
                .trim();
            
            if (!this.storyBox.querySelector('.current-segment')) {
                this.storyBox.innerHTML += `<p class="current-segment">${cleanStory}</p>`;
            } else {
                const currentSegment = this.storyBox.querySelector('.current-segment');
                currentSegment.textContent = cleanStory;
            }
        }
    }

    async generateStorySegment(prompt) {
        try {
            this.choiceButtons.forEach(btn => btn.disabled = true);
            
            const message = {
                content: prompt,
                role: "user"
            };
            this.messages.push(message);

            let curMessage = "";
            const completion = await this.engine.chat.completions.create({
                stream: true,
                messages: this.messages,
            });

            
            const previousSegment = this.storyBox.querySelector('.current-segment');
            if (previousSegment) {
                previousSegment.classList.remove('current-segment');
            }

            for await (const chunk of completion) {
                const curDelta = chunk.choices[0].delta.content;
                if (curDelta) {
                    curMessage += curDelta;
                    
                    if (!curMessage.includes("CHOICES:")) {
                        this.updateStoryText(curMessage);
                    }
                }
            }

            const finalMessage = await this.engine.getMessage();
            this.messages.push({
                content: finalMessage,
                role: "assistant"
            });

            const [story, choices] = this.parseResponse(finalMessage);
            
            // Update the final story segment
            const currentSegment = this.storyBox.querySelector('.current-segment');
            if (currentSegment) {
                currentSegment.textContent = story.replace(/^STORY:\s*/i, '');
                currentSegment.classList.remove('current-segment');
            }
            
            this.updateChoices(choices);
            this.choiceButtons.forEach(btn => btn.disabled = false);
        } catch (error) {
            console.error("Error generating story:", error);
            this.storyBox.innerHTML += `<p>An error occurred while generating the story.</p>`;
            this.updateChoices(["Try again", "Restart", "Continue anyway", "Start over"]);
        }
    }

    updateChoices(choices) {
        this.choiceButtons.forEach((button, index) => {
            button.textContent = choices[index] || `Choice ${index + 1}`;
        });
    }
}

// Initialize the game when the page loads
window.addEventListener("load", () => {
    const game = new StoryGame();
});
