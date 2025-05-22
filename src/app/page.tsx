
"use client";

import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { predictTargetPriceProbability, type PredictTargetPriceProbabilityOutput, type PredictTargetPriceProbabilityInput } from '@/ai/flows/predict-target-price-probability';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';
import { Tags, Link2, Search, DollarSign, CalendarClock, Target, Brain, Percent, CalendarCheck, MessageSquareText, LineChart, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface PriceEntry {
  date: string; // YYYY-MM-DD
  price: number;
}

export default function PrixSurveillePage() {
  const [productUrl, setProductUrl] = useState<string>('');
  const [productName, setProductName] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [lastScraped, setLastScraped] = useState<Date | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceEntry[]>([]);
  
  const [targetPriceInput, setTargetPriceInput] = useState<string>('');
  const [parsedTargetPrice, setParsedTargetPrice] = useState<number | null>(null);

  const [prediction, setPrediction] = useState<PredictTargetPriceProbabilityOutput | null>(null);

  const [isLoadingScrape, setIsLoadingScrape] = useState<boolean>(false);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState<boolean>(false);
  
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const { toast } = useToast();

  const handleUrlSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productUrl) {
      setScrapeError("Veuillez entrer une URL de produit.");
      return;
    }
    try {
      new URL(productUrl); // Basic URL validation
    } catch (e) {
      setScrapeError("URL invalide. Veuillez vérifier le format.");
      toast({ title: "Erreur", description: "URL invalide.", variant: "destructive" });
      return;
    }

    setIsLoadingScrape(true);
    setScrapeError(null);
    setProductName(null); // Reset previous product info
    setCurrentPrice(null);
    setLastScraped(null);
    setProductImage(null);
    // Price history is typically kept for a URL, but for simulation, we reset or append based on URL.
    // For this simple version, let's reset history if URL changes significantly or it's a new product.
    // A real app would fetch existing history for this URL. Here we'll just start fresh.
    setPriceHistory([]); 
    setPrediction(null);


    // Simulate scraping
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    try {
      const newPrice = Math.floor(Math.random() * 180) + 20; // Random price between 20-200
      const currentDate = new Date();
      const newProductName = `Produit Exemple de ${new URL(productUrl).hostname}`;
      const newProductImage = `https://placehold.co/600x400.png?text=${encodeURIComponent(newProductName)}`;


      setProductName(newProductName);
      setCurrentPrice(newPrice);
      setLastScraped(currentDate);
      setProductImage(newProductImage);

      const newPriceEntry: PriceEntry = { date: currentDate.toISOString().split('T')[0], price: newPrice };
      setPriceHistory([newPriceEntry]);
      
      toast({ title: "Produit trouvé!", description: `${newProductName} - Prix: €${newPrice}` });
    } catch (error) {
      setScrapeError("Impossible de récupérer les informations du produit. Le site n'est peut-être pas supporté ou l'URL est incorrecte.");
      toast({ title: "Erreur de scraping", description: "Détails de l'erreur simulée.", variant: "destructive" });
    } finally {
      setIsLoadingScrape(false);
    }
  };

  const handleGetPrediction = async () => {
    if (!parsedTargetPrice || priceHistory.length === 0) {
      setPredictionError("Veuillez définir un prix cible et avoir un historique de prix.");
      return;
    }
    
    setIsLoadingPrediction(true);
    setPredictionError(null);
    setPrediction(null);

    try {
      const input: PredictTargetPriceProbabilityInput = {
        priceHistory: priceHistory,
        targetPrice: parsedTargetPrice,
      };
      const result = await predictTargetPriceProbability(input);
      setPrediction(result);
      toast({ title: "Prédiction calculée!", description: `Probabilité d'atteindre €${parsedTargetPrice}: ${(result.probability * 100).toFixed(0)}%` });
    } catch (error) {
      console.error("AI Prediction Error:", error);
      setPredictionError("Erreur lors du calcul de la prédiction.");
      toast({ title: "Erreur de prédiction IA", description: "Impossible de calculer la prédiction.", variant: "destructive" });
    } finally {
      setIsLoadingPrediction(false);
    }
  };
  
  useEffect(() => {
    const price = parseFloat(targetPriceInput);
    if (!isNaN(price) && price > 0) {
      setParsedTargetPrice(price);
    } else {
      setParsedTargetPrice(null);
    }
  }, [targetPriceInput]);

  // Automatically trigger prediction if target price is set and history exists
  useEffect(() => {
    if (parsedTargetPrice && priceHistory.length > 0) {
      handleGetPrediction();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedTargetPrice, priceHistory.length]); // Rerun when priceHistory length changes (new scrape)

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-8 px-4">
      <header className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Tags className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">Prix Surveille</h1>
        </div>
        <p className="text-muted-foreground text-lg">Votre assistant intelligent pour le suivi des prix.</p>
      </header>

      <main className="w-full max-w-3xl space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Link2 className="h-6 w-6 text-primary" />
              Suivre un nouveau produit
            </CardTitle>
            <CardDescription>Entrez l'URL du produit que vous souhaitez surveiller.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <Label htmlFor="productUrl" className="text-base">URL du produit</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="productUrl"
                    type="url"
                    placeholder="https://www.example.com/product-page"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    className="text-base"
                    required
                  />
                  <Button type="submit" disabled={isLoadingScrape} className="text-base px-6">
                    {isLoadingScrape ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 mr-2" />}
                    Suivre
                  </Button>
                </div>
              </div>
              {scrapeError && (
                <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle size={16}/> {scrapeError}</p>
              )}
            </form>
          </CardContent>
        </Card>

        {isLoadingScrape && (
          <div className="flex justify-center items-center p-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3 text-lg text-muted-foreground">Recherche du produit...</p>
          </div>
        )}

        {productName && currentPrice !== null && lastScraped && (
          <Card className="shadow-lg">
            <CardHeader>
              {productImage && (
                <div className="relative w-full h-48 sm:h-64 mb-4 rounded-lg overflow-hidden">
                  <Image src={productImage} alt={productName} layout="fill" objectFit="cover" data-ai-hint="product image" />
                </div>
              )}
              <CardTitle className="text-2xl">{productName}</CardTitle>
              <CardDescription className="flex items-center gap-2 text-base">
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
                Dernière vérification: {format(lastScraped, "dd/MM/yyyy HH:mm")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-2">
                <DollarSign className="h-8 w-8 text-primary" />
                <p className="text-4xl font-bold text-foreground">€{currentPrice.toFixed(2)}</p>
              </div>
              
              <div>
                <Label htmlFor="targetPrice" className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-muted-foreground"/>
                  Prix Cible Désiré (€)
                </Label>
                <Input
                  id="targetPrice"
                  type="number"
                  placeholder="Ex: 75.50"
                  value={targetPriceInput}
                  onChange={(e) => setTargetPriceInput(e.target.value)}
                  className="mt-1 text-base"
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {parsedTargetPrice && priceHistory.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Brain className="h-6 w-6 text-primary" />
                Prédiction de Prix (IA)
              </CardTitle>
              <CardDescription>Probabilité d'atteindre €{parsedTargetPrice.toFixed(2)} et quand vérifier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingPrediction && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Calcul en cours...
                </div>
              )}
              {predictionError && (
                <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle size={16}/> {predictionError}</p>
              )}
              {prediction && !isLoadingPrediction && (
                <>
                  <div className="space-y-1">
                    <Label className="text-base flex items-center gap-2"><Percent className="h-5 w-5 text-muted-foreground" /> Probabilité</Label>
                    <Progress value={prediction.probability * 100} className="w-full h-3" />
                    <p className="text-lg font-semibold text-primary">{(prediction.probability * 100).toFixed(0)}%</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-base flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-muted-foreground" /> Date de vérification suggérée</Label>
                    <p className="text-lg text-foreground">{format(new Date(prediction.suggestedCheckbackDate), "dd MMMM yyyy")}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-base flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-muted-foreground" /> Raisonnement</Label>
                    <p className="text-sm text-muted-foreground italic bg-secondary p-3 rounded-md">{prediction.reasoning}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
        
        {priceHistory.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <LineChart className="h-6 w-6 text-primary" />
                Historique des Prix
              </CardTitle>
              <CardDescription>Évolution du prix du produit au fil du temps.</CardDescription>
            </CardHeader>
            <CardContent>
              <PriceHistoryChart data={priceHistory} />
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Prix Surveille. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
