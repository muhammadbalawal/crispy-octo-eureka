# Smart Excalidraw Requirements Document

## 1. Project Overview

This project aims to leverage large language model capabilities to automatically generate drawing code by calling the Excalidraw API, enabling intelligent Excalidraw graphic drawing functionality.

---

## 2. Functional Requirements

### 2.1 Main Page

The main page is responsible for Excalidraw rendering display and user interaction, containing the following two core areas:

#### 2.1.1 Page Layout
- **Chat Interaction Area**: Contains the chat input box and chat history
- **Code Editor Area**: Displays and edits the generated Excalidraw code
- **Canvas Rendering Area**: Renders Excalidraw graphics in real-time

#### 2.1.2 Drawing Logic
Refer to the `./doc/excalidraw-doc.md` official documentation to call Excalidraw-related APIs for graphic drawing.

### 2.2 Large Model Configuration

Supports calling large language models via API, providing flexible configuration options:

#### 2.2.1 Supported Providers
- OpenAI
- Anthropic

#### 2.2.2 Configuration Items
- **Provider Name**: Custom display name
- **Provider Type**: OpenAI / Anthropic
- **Base URL**: API endpoint address
- **API Key**: Access key
- **Model List**: Dynamically fetches available models through the OpenAI interface

---

## 3. Technical Implementation

### 3.1 Frontend Implementation

#### 3.1.1 Page Composition
- Main page
- Large model configuration modal

#### 3.1.2 Excalidraw Integration

Use the `@excalidraw/excalidraw` package for rendering. Please obtain the latest version of the related documentation through the context7 tool.

**Important Note**: The Excalidraw component and its parent components must use dynamic import.

**Code Example**:
```javascript
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
  },
);

export default function App() {
  return <Excalidraw />;
}
```

### 3.2 Backend Implementation

#### 3.2.1 API Endpoints

**1. Get Model List**
- Function: Returns the list of available models for the currently configured provider

**2. Generate Excalidraw Code**
- Function: Generates corresponding Excalidraw drawing code based on user input

#### 3.2.2 Code Generation Logic

1. **Prompt Construction**: Refer to the `./doc/excalidraw-doc.md` official documentation to create structured prompts
2. **Model Invocation**: Call the large model API using the constructed prompts
3. **Code Return**: Return the generated Excalidraw code to the frontend

---

## 4. Prompt Design Guidelines

### 4.1 Design Objective
Understand user input (articles, requirement descriptions, etc.) and generate corresponding Excalidraw code to help users obtain information clearly and intuitively through visualization.

### 4.2 Application Scenarios
- Education: Knowledge point visualization, concept map drawing
- Scientific Research: Flowcharts, architecture diagrams, data relationship diagrams

### 4.3 Output Requirements
- Clear code structure
- Intuitive visual presentation
- Accurate information delivery

---

## 5. Reference Documentation

- Excalidraw Official Documentation: `./doc/excalidraw-doc.md`
- @excalidraw/excalidraw Latest Documentation: Obtain through the context7 tool
