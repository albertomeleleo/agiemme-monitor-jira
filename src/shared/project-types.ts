export interface Project {
    name: string;
    logo?: string; // Path to the logo file (relative to project root or base64)
    lastModified?: string;
}

export interface ProjectConfig {
    logo?: string;
}
