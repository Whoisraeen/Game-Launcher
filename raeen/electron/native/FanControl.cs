using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json; // Requires .NET Core 3.0+ or NuGet package
// Note: You need LibreHardwareMonitorLib.dll referenced in your project
// Compile with: csc FanControl.cs /reference:LibreHardwareMonitorLib.dll

namespace RaeenFanControl
{
    public class Program
    {
        // Mock structure for LibreHardwareMonitor integration
        // In a real implementation, you would instantiate Computer() from the library
        
        public class HardwareData
        {
            public string Name { get; set; }
            public string Type { get; set; }
            public List<SensorData> Sensors { get; set; } = new List<SensorData>();
        }

        public class SensorData
        {
            public string Name { get; set; }
            public string Type { get; set; } // "Fan", "Temperature", "Control"
            public float Value { get; set; }
        }

        static void Main(string[] args)
        {
            if (args.Length == 0)
            {
                Console.WriteLine("Usage: FanControl.exe [list|set <id> <value>]");
                return;
            }

            string command = args[0];

            if (command == "list")
            {
                // Placeholder for actual LibreHardwareMonitor logic
                // Computer computer = new Computer { IsCpuEnabled = true, IsGpuEnabled = true, IsMotherboardEnabled = true };
                // computer.Open();
                
                var mockData = new List<HardwareData>
                {
                    new HardwareData 
                    { 
                        Name = "Mock Motherboard", 
                        Type = "Motherboard",
                        Sensors = new List<SensorData> 
                        {
                            new SensorData { Name = "CPU Fan", Type = "Fan", Value = 1200 },
                            new SensorData { Name = "Case Fan 1", Type = "Fan", Value = 800 },
                            new SensorData { Name = "Fan Control 1", Type = "Control", Value = 50 } // %
                        }
                    }
                };

                Console.WriteLine(JsonSerializer.Serialize(mockData));
            }
            else if (command == "set" && args.Length >= 3)
            {
                string sensorId = args[1];
                if (int.TryParse(args[2], out int value))
                {
                    // Apply control logic here
                    Console.WriteLine(JsonSerializer.Serialize(new { status = "ok", message = $"Set {sensorId} to {value}%" }));
                }
            }
        }
    }
}
