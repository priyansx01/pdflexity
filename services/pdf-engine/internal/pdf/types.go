package pdf

// Command is the JSON-RPC request read from stdin.
type Command struct {
	Op         string `json:"op"`
	InputPath  string `json:"inputPath"`
	OutputPath string `json:"outputPath"`
	Password   string `json:"password,omitempty"`
}

// Response is the JSON-RPC result written to stdout.
type Response struct {
	Success    bool   `json:"success"`
	OutputPath string `json:"outputPath,omitempty"`
	Error      string `json:"error,omitempty"`
}
