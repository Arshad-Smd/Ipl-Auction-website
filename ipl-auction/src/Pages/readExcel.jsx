const readJson = async ()=>{
    try {
        const response = await fetch("Copy of playerdata.json"); // Path in public folder
        if (!response.ok) throw new Error("Failed to load JSON file");
    
        const jsonData = await response.json(); // Convert to JS object
        return jsonData;
      } catch (error) {
        console.error("Error reading JSON file:", error);
        return null;
      }
}


export default readJson;