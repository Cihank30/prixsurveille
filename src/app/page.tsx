
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
import { Tags, Link2, Search, DollarSign, CalendarClock, Target, Brain, Percent, CalendarCheck, MessageSquareText, LineChart, Loader2, AlertCircle, SheetIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface PriceEntry {
  date: string; // YYYY-MM-DD
  price: number;
}

interface TrackedProduct {
  id: string;
  url: string;
  name: string | null;
  currentPrice: number | null;
  productImage: string | null;
  lastScraped: Date | null;
  priceHistory: PriceEntry[];
  targetPriceInput: string;
  prediction: PredictTargetPriceProbabilityOutput | null;
  isLoadingScrape: boolean;
  isLoadingPrediction: boolean;
  scrapeError: string | null;
  predictionError: string | null;
}

export default function PrixSurveillePage() {
  const [newProductUrl, setNewProductUrl] = useState<string>('');
  const [trackedProducts, setTrackedProducts] = useState<TrackedProduct[]>([]);
  const [globalScrapeError, setGlobalScrapeError] = useState<string | null>(null);
  
  const { toast } = useToast();

  const generateProductId = () => Date.now().toString() + Math.random().toString(36).substring(2, 9);

  const handleUrlSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newProductUrl) {
      setGlobalScrapeError("Veuillez entrer une URL de produit.");
      return;
    }
    try {
      new URL(newProductUrl); // Basic URL validation
    } catch (e) {
      setGlobalScrapeError("URL invalide. Veuillez vérifier le format.");
      toast({ title: "Erreur", description: "URL invalide.", variant: "destructive" });
      return;
    }

    setGlobalScrapeError(null);
    const productId = generateProductId();
    const newProductEntry: TrackedProduct = {
      id: productId,
      url: newProductUrl,
      name: null,
      currentPrice: null,
      productImage: null,
      lastScraped: null,
      priceHistory: [],
      targetPriceInput: '',
      prediction: null,
      isLoadingScrape: true,
      isLoadingPrediction: false,
      scrapeError: null,
      predictionError: null,
    };

    setTrackedProducts(prev => [newProductEntry, ...prev]);
    setNewProductUrl(''); // Clear input after submission

    // Simulate scraping
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    try {
      const newPrice = Math.floor(Math.random() * 180) + 20; // Random price between 20-200
      const currentDate = new Date();
      const hostname = new URL(newProductUrl).hostname;
      const newProductName = `Produit Exemple de ${hostname}`;
      const newProductImage = `https://placehold.co/600x400.png?text=${encodeURIComponent(newProductName)}`;
      const newPriceEntryData: PriceEntry = { date: currentDate.toISOString().split('T')[0], price: newPrice };

      setTrackedProducts(prev => prev.map(p => 
        p.id === productId ? {
          ...p,
          name: newProductName,
          currentPrice: newPrice,
          lastScraped: currentDate,
          productImage: newProductImage,
          priceHistory: [newPriceEntryData],
          isLoadingScrape: false,
        } : p
      ));
      
      toast({ title: "Produit suivi!", description: `${newProductName} - Prix: €${newPrice}` });

      // Trigger prediction if target price was already set (e.g. if this was a re-scrape feature)
      const updatedProduct = trackedProducts.find(p => p.id === productId);
      if (updatedProduct) {
        const targetPriceNum = parseFloat(updatedProduct.targetPriceInput);
        if (!isNaN(targetPriceNum) && targetPriceNum > 0) {
          triggerPrediction(productId, targetPriceNum);
        }
      }

    } catch (error) {
      setTrackedProducts(prev => prev.map(p => 
        p.id === productId ? {
          ...p,
          scrapeError: "Impossible de récupérer les informations du produit. Le site n'est peut-être pas supporté ou l'URL est incorrecte.",
          isLoadingScrape: false,
        } : p
      ));
      toast({ title: "Erreur de scraping", description: "Détails de l'erreur simulée.", variant: "destructive" });
    }
  };

  const handleTargetPriceChange = (productId: string, value: string) => {
    setTrackedProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, targetPriceInput: value, prediction: null, predictionError: null } : p // Reset prediction when target changes
    ));
    
    const targetPriceNum = parseFloat(value);
    const product = trackedProducts.find(p => p.id === productId);
    if (product && !isNaN(targetPriceNum) && targetPriceNum > 0 && product.priceHistory.length > 0) {
      triggerPrediction(productId, targetPriceNum);
    }
  };

  const triggerPrediction = async (productId: string, targetPrice: number) => {
    const product = trackedProducts.find(p => p.id === productId);
    if (!product || product.priceHistory.length === 0) {
      setTrackedProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, predictionError: "Historique de prix manquant pour la prédiction." } : p
      ));
      return;
    }

    setTrackedProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, isLoadingPrediction: true, predictionError: null, prediction: null } : p
    ));

    try {
      const input: PredictTargetPriceProbabilityInput = {
        priceHistory: product.priceHistory,
        targetPrice: targetPrice,
      };
      const result = await predictTargetPriceProbability(input);
      setTrackedProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, prediction: result, isLoadingPrediction: false } : p
      ));
      toast({ title: "Prédiction calculée!", description: `Probabilité pour ${product.name}: ${(result.probability * 100).toFixed(0)}%` });
    } catch (error) {
      console.error("AI Prediction Error for product " + productId + ":", error);
      setTrackedProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, predictionError: "Erreur lors du calcul de la prédiction.", isLoadingPrediction: false } : p
      ));
      toast({ title: "Erreur de prédiction IA", description: "Impossible de calculer la prédiction.", variant: "destructive" });
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setTrackedProducts(prev => prev.filter(p => p.id !== productId));
    toast({ title: "Produit retiré", description: "Le produit a été retiré de la liste de suivi." });
  };

  const handleExportToExcel = () => {
    if (trackedProducts.length === 0) {
      toast({ title: "Aucun produit", description: "Il n'y a aucun produit à exporter.", variant: "default" });
      return;
    }

    const dataToExport = trackedProducts.map(p => {
      const parsedTarget = parseFloat(p.targetPriceInput);
      const targetPriceDisplay = (!isNaN(parsedTarget) && parsedTarget > 0) ? parsedTarget.toFixed(2) : 'N/A';
      return {
        'Nom du Produit': p.name || 'N/A',
        'URL': p.url,
        'Prix Actuel (€)': p.currentPrice?.toFixed(2) || 'N/A',
        'Prix Cible (€)': targetPriceDisplay,
        'Probabilité Atteinte Cible (%)': p.prediction ? (p.prediction.probability * 100).toFixed(0) : 'N/A',
        'Date de Vérification Suggérée': p.prediction ? format(new Date(p.prediction.suggestedCheckbackDate), "dd MMMM yyyy") : 'N/A',
        'Raisonnement IA': p.prediction ? p.prediction.reasoning : 'N/A',
        'Dernière Vérification': p.lastScraped ? format(p.lastScraped, "dd/MM/yyyy HH:mm") : 'N/A',
        'Historique des Prix (JSON)': JSON.stringify(p.priceHistory),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PrixSurveille");
    XLSX.writeFile(workbook, "PrixSurveille_Export.xlsx");
    toast({ title: "Exportation réussie!", description: "Les données ont été exportées vers Excel." });
  };


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
                <Label htmlFor="newProductUrl" className="text-base">URL du produit</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="newProductUrl"
                    type="url"
                    placeholder="https://www.example.com/product-page"
                    value={newProductUrl}
                    onChange={(e) => setNewProductUrl(e.target.value)}
                    className="text-base"
                    required
                  />
                  <Button type="submit" disabled={trackedProducts.some(p => p.isLoadingScrape)} className="text-base px-6">
                    {trackedProducts.some(p => p.isLoadingScrape && p.url === newProductUrl) ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 mr-2" />}
                    Suivre
                  </Button>
                </div>
              </div>
              {globalScrapeError && (
                <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle size={16}/> {globalScrapeError}</p>
              )}
            </form>
          </CardContent>
        </Card>

        {trackedProducts.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={handleExportToExcel} variant="outline" className="text-base">
              <SheetIcon className="h-5 w-5 mr-2" />
              Exporter vers Excel
            </Button>
          </div>
        )}
        
        <div className="space-y-6">
          {trackedProducts.map((product) => (
            <Card key={product.id} className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    {product.productImage && (
                      <div className="relative w-full h-40 sm:h-56 mb-4 rounded-lg overflow-hidden">
                        <Image src={product.productImage} alt={product.name || 'Product image'} layout="fill" objectFit="cover" data-ai-hint="product image" />
                      </div>
                    )}
                    <CardTitle className="text-xl md:text-2xl">{product.name || product.url}</CardTitle>
                    {product.lastScraped && (
                      <CardDescription className="flex items-center gap-2 text-sm md:text-base">
                        <CalendarClock className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                        Dernière vérification: {format(product.lastScraped, "dd/MM/yyyy HH:mm")}
                      </CardDescription>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(product.id)} aria-label="Retirer le produit">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
                 {product.isLoadingScrape && (
                  <div className="flex items-center gap-2 text-muted-foreground mt-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Recherche du produit...
                  </div>
                )}
                {product.scrapeError && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-2"><AlertCircle size={16}/> {product.scrapeError}</p>
                )}
              </CardHeader>
              {product.name && product.currentPrice !== null && (
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <DollarSign className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                    <p className="text-3xl md:text-4xl font-bold text-foreground">€{product.currentPrice.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <Label htmlFor={`targetPrice-${product.id}`} className="text-sm md:text-base flex items-center gap-2">
                      <Target className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground"/>
                      Prix Cible Désiré (€)
                    </Label>
                    <Input
                      id={`targetPrice-${product.id}`}
                      type="number"
                      placeholder="Ex: 75.50"
                      value={product.targetPriceInput}
                      onChange={(e) => handleTargetPriceChange(product.id, e.target.value)}
                      className="mt-1 text-sm md:text-base"
                      step="0.01"
                      disabled={product.isLoadingPrediction}
                    />
                  </div>

                  {(product.isLoadingPrediction || product.prediction || product.predictionError) && (
                     <Card className="bg-secondary/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                            <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                            Prédiction de Prix (IA)
                          </CardTitle>
                           {parseFloat(product.targetPriceInput) > 0 && <CardDescription>Probabilité d'atteindre €{parseFloat(product.targetPriceInput).toFixed(2)} et quand vérifier.</CardDescription>}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {product.isLoadingPrediction && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-5 w-5 animate-spin" /> Calcul en cours...
                            </div>
                          )}
                          {product.predictionError && !product.isLoadingPrediction && (
                            <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle size={16}/> {product.predictionError}</p>
                          )}
                          {product.prediction && !product.isLoadingPrediction && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-sm md:text-base flex items-center gap-2"><Percent className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" /> Probabilité</Label>
                                <Progress value={product.prediction.probability * 100} className="w-full h-2 md:h-3" />
                                <p className="text-md md:text-lg font-semibold text-primary">{(product.prediction.probability * 100).toFixed(0)}%</p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-sm md:text-base flex items-center gap-2"><CalendarCheck className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" /> Date de vérification suggérée</Label>
                                <p className="text-md md:text-lg text-foreground">{format(new Date(product.prediction.suggestedCheckbackDate), "dd MMMM yyyy")}</p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-sm md:text-base flex items-center gap-2"><MessageSquareText className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" /> Raisonnement</Label>
                                <p className="text-xs md:text-sm text-muted-foreground italic bg-background/50 p-2 md:p-3 rounded-md">{product.prediction.reasoning}</p>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                  )}
                  
                  {product.priceHistory.length > 0 && (
                    <Card className="bg-secondary/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                          <LineChart className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                          Historique des Prix
                        </CardTitle>
                        <CardDescription>Évolution du prix du produit au fil du temps.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <PriceHistoryChart data={product.priceHistory} />
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              )}
              {product.name && product.currentPrice === null && !product.isLoadingScrape && !product.scrapeError && (
                <CardContent>
                  <p className="text-muted-foreground">En attente des informations du produit...</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
        {trackedProducts.length === 0 && !trackedProducts.some(p => p.isLoadingScrape) && (
            <Card className="shadow-lg">
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Aucun produit n'est actuellement suivi. Ajoutez une URL ci-dessus pour commencer.</p>
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
