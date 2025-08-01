import { lightTheme, plus } from "@/utils/theme";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box, Container } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import MSidebar from "@/app/components/sidebar/Sidebar";

export const metadata = {
  title: "Pontoon",
  description: "Pontoon is an open source, self-hosted, data export platform.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={plus.variable}>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={lightTheme}>
            <CssBaseline />
            <Box
              className="mainwrapper"
              sx={{
                display: "flex",
                minHeight: "100vh",
                width: "100%",
              }}
            >
              <MSidebar />
              <Box
                className="page-wrapper"
                sx={{
                  display: "flex",
                  flexGrow: 1,
                  paddingBottom: "60px",
                  flexDirection: "column",
                  zIndex: 1,
                  backgroundColor: "transparent",
                }}
              >
                <Container
                  sx={{
                    paddingTop: "20px",
                    maxWidth: "1536px",
                  }}
                  maxWidth="xl"
                >
                  <Box sx={{ minHeight: "calc(100vh - 170px)" }}>
                    {children}
                  </Box>
                </Container>
              </Box>
            </Box>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
