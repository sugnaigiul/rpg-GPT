# RPG-GPT

An interactive text-based RPG game powered by LLMs (Large Language Models) that creates a dynamic and personalized story experiences.

## Overview

RPG-GPT is a web-based application that leverages multiple AI agents to create and manage interactive storytelling experiences. Players can define their own story context and embark on a choice-driven adventure where every decision shapes the narrative.

## Features

- **Custom Story Context**: Players can input their desired story setting, characters, and scenario
- **Dynamic Story Generation**: Real-time story generation with branching narratives
- **Interactive Choices**: Four distinct options at each story junction
- **Natural Story Conclusions**: Stories can reach satisfying endings through:
  - Victory conditions
  - Character death
  - Major story resolutions
- **Responsive Design**: Clean, modern interface with visual feedback
- **Browser Compatibility**: Optimized for Chrome and Edge

## Multi-Agent System

The game utilizes two specialized AI agents:

### Context Summarizer Agent

- Processes player's initial story input
- Creates concise, focused 2-3 sentence summaries
- Ensures narrative consistency and clear story goals

### Story Master Agent

- Generates immersive story segments
- Creates contextual choices based on player decisions
- Manages story progression and endings
- Maintains second-person perspective narration
- Monitors victory/failure conditions

## Technical Requirements

- Modern web browser (Chrome or Edge recommended)
- Internet connection for model downloading
- Sufficient memory for LLM operations

## Getting Started

1. Select and download the recommended model (Llama-3.2-3B-Instruct-q4f32_1-MLC)
2. Input your desired story context
3. Review and accept the generated summary
4. Begin your adventure!
