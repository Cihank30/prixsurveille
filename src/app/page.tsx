
"use client";

import { useState, useEffect, FormEvent, useMemo } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { predictTargetPriceProbability, type PredictTargetPriceProbabilityOutput, type PredictTargetPriceProbabilityInput } from '@/ai/flows/predict-target-price-probability';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tags, Link2, Search, DollarSign, CalendarClock, Target, Brain, Percent, CalendarCheck, MessageSquareText, LineChart, Loader2, AlertCircle, SheetIcon, Trash2, RefreshCw, Edit3, Filter as FilterIcon, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";

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
  isLoadingRefresh: boolean;
  scrapeError: string | null;
  predictionError: string | null;
}

export default function PrixSurveillePage() {
  const [newProductUrl, setNewProductUrl] = useState<string>('');
  const [trackedProducts, setTrackedProducts] = useState<TrackedProduct[]>([]);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const { toast } = useToast();

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');

  const [sortOption, setSortOption] = useState<string>('lastScraped_desc'); // Default: Newest first
  const [filterText, setFilterText] = useState<string>('');
  const [filterTargetMetOnly, setFilterTargetMetOnly] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedProducts = localStorage.getItem('trackedProducts');
      if (savedProducts) {
        try {
          const parsedProducts = JSON.parse(savedProducts) as TrackedProduct[];
          // Ensure lastScraped is a Date object
          const productsWithDateObjects = parsedProducts.map(p => ({
            ...p,
            lastScraped: p.lastScraped ? new Date(p.lastScraped) : null,
          }));
          setTrackedProducts(productsWithDateObjects);
        } catch (error) {
          console.error("Failed to parse tracked products from localStorage", error);
          localStorage.removeItem('trackedProducts'); // Clear corrupted data
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && trackedProducts.length > 0) { // Only save if there's something to save and not initial empty
        localStorage.setItem('trackedProducts', JSON.stringify(trackedProducts));
    } else if (typeof window !== 'undefined' && trackedProducts.length === 0 && localStorage.getItem('trackedProducts')) {
        // If all products are removed, clear local storage
        localStorage.removeItem('trackedProducts');
    }
  }, [trackedProducts]);


  const generateProductId = () => Date.now().toString() + Math.random().toString(36).substring(2, 9);

  const handleUrlSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newProductUrl.trim()) {
      toast({ title: "Aucune URL fournie", description: "Veuillez entrer au moins une URL de produit.", variant: "destructive" });
      return;
    }

    setIsBulkAdding(true);
    const urlsToProcess = newProductUrl.split('\n').map(url => url.trim()).filter(url => url);

    if (urlsToProcess.length === 0) {
      toast({ title: "Aucune URL valide", description: "Veuillez vérifier les URLs entrées. Séparez chaque URL par un saut de ligne.", variant: "destructive" });
      setIsBulkAdding(false);
      return;
    }

    const productsToAdd: TrackedProduct[] = [];
    const invalidUrlsFound: string[] = [];

    for (const url of urlsToProcess) {
      try {
        new URL(url); 
        const productId = generateProductId();
        const newProductEntry: TrackedProduct = {
          id: productId,
          url: url,
          name: null,
          currentPrice: null,
          productImage: null,
          lastScraped: null,
          priceHistory: [],
          targetPriceInput: '',
          prediction: null,
          isLoadingScrape: true,
          isLoadingPrediction: false,
          isLoadingRefresh: false,
          scrapeError: null,
          predictionError: null,
        };
        productsToAdd.push(newProductEntry);
      } catch (e) {
        invalidUrlsFound.push(url);
      }
    }

    if (invalidUrlsFound.length > 0) {
      toast({
        title: "Certaines URLs sont invalides",
        description: `Les URLs suivantes n'ont pas pu être traitées : ${invalidUrlsFound.join(', ')}. Veuillez vérifier leur format.`,
        variant: "destructive",
        duration: 7000,
      });
    }

    if (productsToAdd.length === 0) {
      setIsBulkAdding(false);
      setNewProductUrl('');
      return;
    }
    
    setTrackedProducts(prev => [...productsToAdd, ...prev]);
    setNewProductUrl('');

    productsToAdd.forEach(productEntry => {
      (async (productIdToScrape: string, urlToScrape: string) => {
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); 

        try {
          const newPrice = Math.floor(Math.random() * 180) + 20;
          const currentDate = new Date();
          const hostname = new URL(urlToScrape).hostname;
          const newProductName = `Produit Exemple de ${hostname}`;
          const newProductImage = `https://placehold.co/300x200.png?text=${encodeURIComponent(newProductName)}`;
          const newPriceEntryData: PriceEntry = { date: currentDate.toISOString().split('T')[0], price: newPrice };

          setTrackedProducts(prev => prev.map(p => 
            p.id === productIdToScrape ? {
              ...p,
              name: newProductName,
              currentPrice: newPrice,
              lastScraped: currentDate,
              productImage: newProductImage,
              priceHistory: [newPriceEntryData],
              isLoadingScrape: false,
            } : p
          ));
          
          toast({ title: "Produit suivi!", description: `${newProductName} - Prix: CAD ${newPrice.toFixed(2)}` });

        } catch (error) {
          setTrackedProducts(prev => prev.map(p => 
            p.id === productIdToScrape ? {
              ...p,
              scrapeError: "Impossible de récupérer les informations du produit. Le site n'est peut-être pas supporté ou l'URL est incorrecte.",
              isLoadingScrape: false,
            } : p
          ));
          toast({ title: "Erreur de scraping", description: `Détails de l'erreur simulée pour ${urlToScrape}.`, variant: "destructive" });
        }
      })(productEntry.id, productEntry.url);
    });
    
    setIsBulkAdding(false); 
  };

  const handleRefreshPrice = async (productId: string) => {
    setTrackedProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, isLoadingRefresh: true, scrapeError: null } : p
    ));

    await new Promise(resolve => setTimeout(resolve, 1000));
    const product = trackedProducts.find(p => p.id === productId);
    if (!product) return;

    try {
      const oldPrice = product.currentPrice;
      let newPrice;
      if (Math.random() < 0.3) {
        newPrice = oldPrice !== null ? oldPrice : Math.floor(Math.random() * 180) + 20;
      } else {
        newPrice = Math.floor(Math.random() * 180) + 20; 
      }

      const currentDate = new Date();
      const newPriceEntryData: PriceEntry = { date: currentDate.toISOString().split('T')[0], price: newPrice };
      
      let updatedProductHistory: PriceEntry[] = [];
      setTrackedProducts(prev => prev.map(p => {
        if (p.id === productId) {
          updatedProductHistory = [...p.priceHistory, newPriceEntryData].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);
          return {
            ...p,
            currentPrice: newPrice,
            lastScraped: currentDate,
            priceHistory: updatedProductHistory,
            isLoadingRefresh: false,
          };
        }
        return p;
      }));

      if (oldPrice !== null && newPrice !== oldPrice) {
        const priceChange = newPrice - oldPrice;
        toast({ 
          title: "Prix mis à jour!", 
          description: `${product.name}: CAD ${newPrice.toFixed(2)} ( ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)} CAD )` 
        });
      } else if (oldPrice === null) {
         toast({ 
          title: "Prix récupéré!", 
          description: `${product.name}: CAD ${newPrice.toFixed(2)}` 
        });
      } else {
         toast({ 
          title: "Prix vérifié", 
          description: `${product.name}: Pas de changement de prix (CAD ${newPrice.toFixed(2)})` 
        });
      }
      
      const targetPriceNum = parseFloat(product.targetPriceInput);
      if (!isNaN(targetPriceNum) && targetPriceNum > 0) {
        triggerPrediction(productId, targetPriceNum, updatedProductHistory);
      }

    } catch (error) {
      setTrackedProducts(prev => prev.map(p => 
        p.id === productId ? {
          ...p,
          scrapeError: "Impossible de rafraîchir le prix.",
          isLoadingRefresh: false,
        } : p
      ));
      toast({ title: "Erreur de rafraîchissement", description: `Impossible de mettre à jour le prix pour ${product.name}.`, variant: "destructive" });
    }
  };

  const handleTargetPriceChange = (productId: string, value: string) => {
    setTrackedProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, targetPriceInput: value, prediction: null, predictionError: null } : p 
    ));
    
    const targetPriceNum = parseFloat(value);
    const product = trackedProducts.find(p => p.id === productId);
    if (product && !isNaN(targetPriceNum) && targetPriceNum > 0 && product.priceHistory.length > 0) {
      triggerPrediction(productId, targetPriceNum, product.priceHistory);
    }
  };

  const triggerPrediction = async (productId: string, targetPrice: number, priceHistory: PriceEntry[]) => {
    const product = trackedProducts.find(p => p.id === productId);
    if (!product || priceHistory.length === 0) {
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
        priceHistory: priceHistory.map(ph => ({date: ph.date, price: ph.price})), // Ensure correct structure
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

  const handleEditNameClick = (product: TrackedProduct) => {
    setEditingProductId(product.id);
    setEditingNameValue(product.name || '');
  };

  const handleSaveName = (productId: string) => {
    setTrackedProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, name: editingNameValue.trim() || p.name } : p
    ));
    setEditingProductId(null);
    toast({ title: "Nom mis à jour!"});
  };

  const handleCancelEditName = () => {
    setEditingProductId(null);
  };


  const getExportData = () => {
    return displayedProducts.map(p => {
      const parsedTarget = parseFloat(p.targetPriceInput);
      const targetPriceDisplay = (!isNaN(parsedTarget) && parsedTarget > 0) ? parsedTarget.toFixed(2) : 'N/A';
      return {
        'Nom du Produit': p.name || 'N/A',
        'URL': p.url,
        'Prix Actuel (CAD)': p.currentPrice?.toFixed(2) || 'N/A',
        'Prix Cible (CAD)': targetPriceDisplay,
        'Probabilité Atteinte Cible (%)': p.prediction ? (p.prediction.probability * 100).toFixed(0) : 'N/A',
        'Date de Vérification Suggérée': p.prediction && p.prediction.suggestedCheckbackDate ? format(new Date(p.prediction.suggestedCheckbackDate), "dd MMMM yyyy") : 'N/A',
        'Raisonnement IA': p.prediction ? p.prediction.reasoning : 'N/A',
        'Dernière Vérification': p.lastScraped ? format(p.lastScraped, "dd/MM/yyyy HH:mm") : 'N/A',
        'Historique des Prix (JSON)': JSON.stringify(p.priceHistory),
      };
    });
  };

  const handleExportToExcel = () => {
    if (displayedProducts.length === 0) {
      toast({ title: "Aucun produit", description: "Il n'y a aucun produit à exporter.", variant: "default" });
      return;
    }
    const dataToExport = getExportData();
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PrixSurveille");
    XLSX.writeFile(workbook, "PrixSurveille_Export.xlsx");
    toast({ title: "Exportation Excel réussie!", description: "Les données ont été exportées." });
  };

  const handleExportToCSV = () => {
    if (displayedProducts.length === 0) {
      toast({ title: "Aucun produit", description: "Il n'y a aucun produit à exporter.", variant: "default" });
      return;
    }
    const dataToExport = getExportData();
    if (dataToExport.length === 0) return;

    const headers = Object.keys(dataToExport[0]);
    const csvRows = [
      headers.join(','),
      ...dataToExport.map(row => 
        headers.map(fieldName => 
          JSON.stringify(row[fieldName as keyof typeof row], (key, value) => value === null || value === undefined ? '' : value)
        ).join(',')
      )
    ];
    const csvString = csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "PrixSurveille_Export.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast({ title: "Exportation CSV réussie!", description: "Les données ont été exportées." });
  };

  const displayedProducts = useMemo(() => {
    let products = [...trackedProducts];

    // Filtering
    if (filterText) {
      products = products.filter(p => 
        p.name?.toLowerCase().includes(filterText.toLowerCase()) || 
        p.url.toLowerCase().includes(filterText.toLowerCase())
      );
    }
    if (filterTargetMetOnly) {
      products = products.filter(p => 
        p.currentPrice !== null && 
        parseFloat(p.targetPriceInput) > 0 && 
        p.currentPrice <= parseFloat(p.targetPriceInput)
      );
    }

    // Sorting
    const [field, order] = sortOption.split('_');
    products.sort((a, b) => {
      let valA, valB;
      switch (field) {
        case 'name':
          valA = a.name || '';
          valB = b.name || '';
          break;
        case 'currentPrice':
          valA = a.currentPrice ?? Infinity; // Unset prices go last/first depending on order
          valB = b.currentPrice ?? Infinity;
          break;
        case 'targetPrice':
          valA = parseFloat(a.targetPriceInput) || Infinity;
          valB = parseFloat(b.targetPriceInput) || Infinity;
          break;
        case 'lastScraped':
          valA = a.lastScraped ? new Date(a.lastScraped).getTime() : 0;
          valB = b.lastScraped ? new Date(b.lastScraped).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return order === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return products;
  }, [trackedProducts, sortOption, filterText, filterTargetMetOnly]);
  
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center py-8 px-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Chargement de l'application...</p>
      </div>
    );
  }


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
              Suivre de nouveaux produits
            </CardTitle>
            <CardDescription>Entrez les URLs des produits (une par ligne) que vous souhaitez surveiller.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <Label htmlFor="newProductUrls" className="text-base">URLs des produits</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 mt-1">
                  <Textarea
                    id="newProductUrls"
                    placeholder="https://www.example.com/produit-A&#x0a;https://www.example.ca/item-B&#x0a;https://www.anotherstore.com/product-C"
                    value={newProductUrl}
                    onChange={(e) => setNewProductUrl(e.target.value)}
                    className="text-base min-h-[80px] flex-grow"
                    rows={3}
                  />
                  <Button type="submit" disabled={isBulkAdding} className="text-base px-6 w-full sm:w-auto">
                    {isBulkAdding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 mr-2" />}
                    Suivre
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {trackedProducts.length > 0 && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FilterIcon className="h-5 w-5 text-primary" />
                Filtrer et Trier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4 items-end">
              <div className="flex-grow">
                <Label htmlFor="filterText">Rechercher par nom/URL</Label>
                <Input 
                  id="filterText" 
                  placeholder="Nom du produit ou URL..." 
                  value={filterText} 
                  onChange={(e) => setFilterText(e.target.value)} 
                  className="mt-1"
                />
              </div>
              <div className="flex-grow">
                <Label htmlFor="sortOption">Trier par</Label>
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger id="sortOption" className="mt-1">
                    <SelectValue placeholder="Trier par..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lastScraped_desc">Dernière vérification (Plus récent)</SelectItem>
                    <SelectItem value="lastScraped_asc">Dernière vérification (Plus ancien)</SelectItem>
                    <SelectItem value="name_asc">Nom (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Nom (Z-A)</SelectItem>
                    <SelectItem value="currentPrice_asc">Prix Actuel (Bas-Haut)</SelectItem>
                    <SelectItem value="currentPrice_desc">Prix Actuel (Haut-Bas)</SelectItem>
                    <SelectItem value="targetPrice_asc">Prix Cible (Bas-Haut)</SelectItem>
                    <SelectItem value="targetPrice_desc">Prix Cible (Haut-Bas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-2 sm:pt-0 sm:self-end sm:pb-[10px]"> {/* Adjusted padding for alignment */}
                <Checkbox 
                  id="filterTargetMet" 
                  checked={filterTargetMetOnly} 
                  onCheckedChange={(checked) => setFilterTargetMetOnly(checked as boolean)}
                />
                <Label htmlFor="filterTargetMet" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Prix cible atteint
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-end gap-2 pt-4">
                 <Button onClick={handleExportToCSV} variant="outline" className="text-base">
                   <SheetIcon className="h-5 w-5 mr-2" />
                   Exporter vers CSV
                 </Button>
                 <Button onClick={handleExportToExcel} variant="outline" className="text-base">
                   <SheetIcon className="h-5 w-5 mr-2" />
                   Exporter vers Excel
                 </Button>
            </CardFooter>
          </Card>
        )}
        
        <div className="space-y-6">
          {displayedProducts.map((product) => {
            const targetPriceMet = product.currentPrice !== null && parseFloat(product.targetPriceInput) > 0 && product.currentPrice <= parseFloat(product.targetPriceInput);
            return (
            <Card key={product.id} className={cn("shadow-lg", targetPriceMet && "border-2 border-green-500 ring-2 ring-green-300")}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    {product.productImage && (
                      <div className="relative w-full h-40 sm:h-56 mb-4 rounded-lg overflow-hidden">
                        <Image src={product.productImage} alt={product.name || 'Product image'} fill style={{objectFit: 'cover'}} data-ai-hint="product clothing" />
                      </div>
                    )}
                    <div className="flex items-center gap-1 mb-1">
                      {editingProductId === product.id ? (
                        <Input
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          onBlur={() => handleSaveName(product.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName(product.id);
                            if (e.key === 'Escape') handleCancelEditName();
                          }}
                          autoFocus
                          className="text-xl md:text-2xl font-semibold h-auto py-0" // Adjusted styling
                        />
                      ) : (
                        <CardTitle className="text-xl md:text-2xl break-words flex-grow cursor-pointer hover:text-primary/80" onClick={() => handleEditNameClick(product)}>
                          {product.name || product.url}
                        </CardTitle>
                      )}
                       {!editingProductId || editingProductId !== product.id ? (
                          <Button variant="ghost" size="icon" onClick={() => handleEditNameClick(product)} aria-label="Modifier le nom du produit" className="flex-shrink-0">
                             <Edit3 className="h-4 w-4 md:h-5 md:w-5" />
                           </Button>
                        ) : (
                          <div className="flex gap-1">
                             <Button variant="ghost" size="icon" onClick={() => handleSaveName(product.id)} aria-label="Enregistrer le nom">
                               <CalendarCheck className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                             </Button>
                             <Button variant="ghost" size="icon" onClick={handleCancelEditName} aria-label="Annuler la modification">
                               <MessageSquareText className="h-4 w-4 md:h-5 md:w-5 text-destructive" /> {/* Placeholder for XCircle */}
                             </Button>
                          </div>
                        )
                       }
                    </div>
                    {product.lastScraped && (
                      <CardDescription className="flex items-center gap-2 text-sm md:text-base">
                        <CalendarClock className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                        Dernière vérification: {format(new Date(product.lastScraped), "dd/MM/yyyy HH:mm")}
                      </CardDescription>
                    )}
                     <CardDescription className="text-xs text-muted-foreground truncate mt-1" title={product.url}>
                        URL: {product.url}
                      </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-2 flex-shrink-0">
                     <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(product.id)} aria-label="Retirer le produit">
                       <Trash2 className="h-5 w-5 text-destructive" />
                     </Button>
                     {product.name && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleRefreshPrice(product.id)} 
                          disabled={product.isLoadingRefresh || product.isLoadingScrape}
                          aria-label="Rafraîchir le prix"
                        >
                          {product.isLoadingRefresh ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                        </Button>
                     )}
                  </div>
                </div>
                 {product.isLoadingScrape && (
                  <div className="flex items-center gap-2 text-muted-foreground mt-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Recherche du produit...
                  </div>
                )}
                {product.scrapeError && !product.isLoadingScrape && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-2"><AlertCircle size={16}/> {product.scrapeError}</p>
                )}
              </CardHeader>
              {product.name && product.currentPrice !== null && (
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <DollarSign className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                    <p className="text-3xl md:text-4xl font-bold text-foreground">CAD {product.currentPrice.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <Label htmlFor={`targetPrice-${product.id}`} className="text-sm md:text-base flex items-center gap-2">
                      <Target className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground"/>
                      Prix Cible Désiré (CAD)
                    </Label>
                    <Input
                      id={`targetPrice-${product.id}`}
                      type="number"
                      placeholder="Ex: 75.50"
                      value={product.targetPriceInput}
                      onChange={(e) => handleTargetPriceChange(product.id, e.target.value)}
                      className="mt-1 text-sm md:text-base"
                      step="0.01"
                      disabled={product.isLoadingPrediction || product.isLoadingRefresh || product.isLoadingScrape}
                    />
                  </div>

                  {(product.isLoadingPrediction || product.prediction || product.predictionError) && (
                     <Card className="bg-secondary/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                            <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                            Prédiction de Prix (IA)
                          </CardTitle>
                           {parseFloat(product.targetPriceInput) > 0 && <CardDescription>Probabilité d'atteindre CAD {parseFloat(product.targetPriceInput).toFixed(2)} et quand vérifier.</CardDescription>}
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
                                <p className="text-md md:text-lg text-foreground">{product.prediction.suggestedCheckbackDate ? format(new Date(product.prediction.suggestedCheckbackDate), "dd MMMM yyyy") : "N/A"}</p>
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
              {product.name && product.currentPrice === null && !product.isLoadingScrape && !product.isLoadingRefresh && !product.scrapeError && (
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">En attente des informations du produit...</p>
                </CardContent>
              )}
            </Card>
          )})}
        </div>
        {displayedProducts.length === 0 && !isBulkAdding && ( 
            <Card className="shadow-lg">
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      {trackedProducts.length > 0 ? "Aucun produit ne correspond à vos filtres." : "Aucun produit n'est actuellement suivi. Ajoutez une ou plusieurs URLs ci-dessus pour commencer."}
                    </p>
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

