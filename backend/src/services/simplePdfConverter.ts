import fs from "fs/promises";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

export class SimplePdfConverter {
  static async convertPptxToPdf(pptxBuffer: Buffer): Promise<Buffer> {
    let tempPptxPath: string | null = null;
    let tempOutputDir: string | null = null;

    try {
      console.log(" Converting PPTX to PDF using LibreOffice...");

      const tempDir = os.tmpdir();
      const tempId = uuidv4();
      tempOutputDir = path.join(tempDir, `pdf_output_${tempId}`);
      tempPptxPath = path.join(tempDir, `certificate_${tempId}.pptx`);

      await fs.mkdir(tempOutputDir, { recursive: true });
      await fs.writeFile(tempPptxPath, pptxBuffer);
      console.log(` Temporary PPTX saved: ${tempPptxPath}`);

      const libreOfficeExe = await this.findLibreOfficeExecutable();
      console.log(` Using LibreOffice: ${libreOfficeExe}`);

      const absolutePptxPath = path.resolve(tempPptxPath);
      const absoluteOutputDir = path.resolve(tempOutputDir);

      const args = [
        "--headless",
        "--nologo",
        "--nofirststartwizard",
        "--norestore",
        "--convert-to",
        "pdf",
        "--outdir",
        absoluteOutputDir,
        absolutePptxPath,
      ];

      console.log(` Running: "${libreOfficeExe}" ${args.join(" ")}`);

      const result = await this.runLibreOfficeCommand(libreOfficeExe, args);

      if (result.success) {
        const pdfFileName = path.basename(tempPptxPath, ".pptx") + ".pdf";
        const pdfPath = path.join(tempOutputDir, pdfFileName);
        const pdfBuffer = await fs.readFile(pdfPath);
        console.log(` PDF generated successfully: ${pdfBuffer.length} bytes`);
        return pdfBuffer;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(" PDF conversion failed:", error);
      throw new Error(
        `LibreOffice PDF conversion failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      try {
        if (tempPptxPath) await fs.unlink(tempPptxPath);
        if (tempOutputDir) {
          const files = await fs.readdir(tempOutputDir);
          for (const file of files) {
            await fs.unlink(path.join(tempOutputDir, file));
          }
          await fs.rmdir(tempOutputDir);
        }
      } catch (cleanupError) {
        console.warn(" Cleanup warning:", cleanupError);
      }
    }
  }

  private static runLibreOfficeCommand(
    executable: string,
    args: string[]
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const spawnOptions: any = {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          SAL_USE_VCLPLUGIN: "svp",
          NO_AT_BRIDGE: "1",
          DBUS_SESSION_BUS_ADDRESS: "",
          LIBREOFFICE_NOGUI: "1",
        },
      };

      if (os.platform() === "win32") {
        spawnOptions.windowsHide = true;
        spawnOptions.detached = false;
      }

      const childProcess = spawn(executable, args, spawnOptions);
      let stderr = "";

      if (childProcess.stderr) {
        childProcess.stderr.on("data", (data) => {
          stderr += data.toString();
        });
      }

      childProcess.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `LibreOffice conversion failed (code ${code}): ${stderr.trim()}`,
          });
        }
      });

      childProcess.on("error", (error) => {
        resolve({
          success: false,
          error: `Failed to start LibreOffice: ${error.message}`,
        });
      });

      setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill();
          resolve({
            success: false,
            error: "LibreOffice conversion timed out",
          });
        }
      }, 180000);
    });
  }

  private static async findLibreOfficeExecutable(): Promise<string> {
    let candidates: string[] = [];

    if (os.platform() === "win32") {
      candidates = [
        "soffice.com",
        "soffice.exe",
        "C:\\Program Files\\LibreOffice\\program\\soffice.com",
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
      ];
    } else {
      candidates = [
        "libreoffice",
        "soffice",
        "/usr/bin/libreoffice",
        "/usr/bin/soffice",
        "/opt/libreoffice/program/soffice",
      ];
    }

    for (const candidate of candidates) {
      try {
        await execAsync(`"${candidate}" --version`, { timeout: 5000 });

        if (
          os.platform() === "win32" &&
          candidate.toLowerCase().endsWith("soffice.exe")
        ) {
          const comCandidate =
            candidate.substring(0, candidate.length - 3) + "com";
          try {
            await fs.access(comCandidate);
            console.log(
              ` Found soffice.exe but preferring soffice.com: ${comCandidate}`
            );
            return comCandidate;
          } catch {
            // soffice.com doesn't exist, use soffice.exe
          }
        }

        return candidate;
      } catch (error) {
        continue;
      }
    }

    throw new Error(
      "LibreOffice not found. Please install LibreOffice and ensure it's in your PATH or installed in a standard location."
    );
  }
}
